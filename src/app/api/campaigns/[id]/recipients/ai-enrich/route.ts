import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { nvidiaNim } from '@/lib/ai/nvidia-nim';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await params;
  const auth = await requireApiAuth('EDITOR');
  if (auth instanceof NextResponse) return auth;

  const workspaceId = auth?.workspaceId ?? 'default-workspace';

  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id, workspaceId },
      include: {
        recipients: {
          where: {
            OR: [{ name: null }, { company: null }],
          },
          take: 30, // Batch limit per AI request
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.recipients.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All recipients already have names and companies assigned',
        enrichedCount: 0,
      });
    }

    const emailList = campaign.recipients.map((r) => r.email);

    // Call NVIDIA NIM to deduce names and companies from email patterns
    const systemPrompt = `You are a B2B contact data enrichment specialist. Given a list of email addresses, deduce the most plausible full name of the person and the company/organization name. Return strictly valid JSON array of objects with keys: "email", "name", and "company". If company is a public provider like Gmail/Yahoo, set company to null. Never return extra conversational text or markdown formatting.`;

    const userPrompt = `Deduce names and companies for these emails:\n${JSON.stringify(emailList, null, 2)}`;

    let enrichedData: Array<{ email: string; name?: string; company?: string }> = [];
    try {
      const aiResult = await nvidiaNim.generate({
        systemPrompt,
        userPrompt,
        temperature: 0.2,
      });

      // Parse JSON from AI response
      const cleanJson = aiResult.text.replace(/```json|```/gi, '').trim();
      enrichedData = JSON.parse(cleanJson);
    } catch {
      // If AI fails or returns non-JSON, fallback gracefully
      enrichedData = [];
    }

    let updatedCount = 0;
    for (const item of enrichedData) {
      if (!item.email) continue;
      const existing = campaign.recipients.find(
        (r) => r.email.toLowerCase() === item.email.toLowerCase()
      );
      if (existing) {
        await prisma.campaignRecipient.update({
          where: { id: existing.id },
          data: {
            name: existing.name || item.name || undefined,
            company: existing.company || item.company || undefined,
          },
        });
        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Enriched ${updatedCount} contacts with AI`,
      enrichedCount: updatedCount,
    });
  } catch (error) {
    console.error('Failed AI contact enrichment', error);
    return NextResponse.json({ error: 'Failed to enrich contacts' }, { status: 500 });
  }
}
