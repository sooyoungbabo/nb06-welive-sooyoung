import { ResidenceStatus } from '@prisma/client';
import * as s from 'superstruct';

export const CreateApartment = s.object({
  name: s.string(),
  address: s.string(),
  description: s.string(),
  apartmentManagementNumber: s.string(),
  startComplexNumber: s.literal(1),
  endComplexNumber: s.min(s.number(), 1),
  startBuildingNumber: s.literal(1),
  endBuildingNumber: s.min(s.number(), 1),
  startFloorNumber: s.literal(1),
  endFloorNumber: s.min(s.number(), 1),
  startUnitNumber: s.literal(1),
  endUnitNumber: s.min(s.number(), 1)
});

export const PatchApartment = s.partial(CreateApartment);
