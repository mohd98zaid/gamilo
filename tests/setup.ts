Object.assign(process.env, { NODE_ENV: 'test', GMAILO_TEST_AUTH_BYPASS: 'true' });
process.env.NVIDIA_PRIMARY_MODEL ||= 'test-primary-model';
