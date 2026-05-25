import 'dotenv-flow/config';
import { seedOrgAndRoles } from './org-and-roles';
import { seedRfpMatrix } from './rfp-matrix';
import { seedConsentP1 } from './consent';
import { seedRightsAndBreach } from './rights-and-breach';
import { seedAssessmentsP3 } from './assessments';
import { seedConnectorsP4 } from './connectors';

async function main() {
  const orgRow = await seedOrgAndRoles();
  await seedRfpMatrix();
  await seedConsentP1(orgRow.id);
  await seedRightsAndBreach(orgRow.id);
  await seedAssessmentsP3(orgRow.id);
  await seedConnectorsP4(orgRow.id);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
