import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmount rendered components between tests (a no-op for node-environment tests).
afterEach(() => cleanup());
