export const ERROR_CODES = {
  AUTH_001: {
    code: 'AUTH_001',
    message: 'Invalid credentials',
  },
  AUTH_002: {
    code: 'AUTH_002',
    message: 'Email already exists',
  },
  AUTH_003: {
    code: 'AUTH_003',
    message: 'User not found',
  },
  CLUB_001: {
    code: 'CLUB_001',
    message: 'Club not found',
  },
  CLUB_002: {
    code: 'CLUB_002',
    message: 'Club name already exists',
  },
  ANALYSIS_001: {
    code: 'ANALYSIS_001',
    message: 'Analysis job not found',
  },
  ANALYSIS_002: {
    code: 'ANALYSIS_002',
    message: 'Analysis already in progress for this session or match',
  },
  ANALYSIS_003: {
    code: 'ANALYSIS_003',
    message: 'Invalid webhook signature',
  },
  ANALYSIS_004: {
    code: 'ANALYSIS_004',
    message: 'External AI analysis module unavailable',
  },
} as const;
