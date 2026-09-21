import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// This repo does not use Vitest globals, so Testing Library's automatic cleanup
// does not register itself: without this, renders leak between tests.
afterEach(cleanup);
