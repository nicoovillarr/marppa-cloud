export interface SystemResetAvailabilityDto {
  enabled: boolean;
  isRootCompany: boolean;
  canReset: boolean;
}

export interface SystemResetResponseDto {
  eventId: number;
}
