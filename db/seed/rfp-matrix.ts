import { RFP_REQUIREMENTS } from '@/lib/rfp/matrix-data';

export async function seedRfpMatrix() {
  console.log(`RFP matrix has ${RFP_REQUIREMENTS.length} representative rows (in-code for P0).`);
}
