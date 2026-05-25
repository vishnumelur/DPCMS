import 'dotenv-flow/config';
import { seedOrgAndRoles } from './org-and-roles';
import { seedRfpMatrix } from './rfp-matrix';
import { seedConsentP1 } from './consent';

async function main() {
  const orgRow = await seedOrgAndRoles();
  await seedRfpMatrix();
  await seedConsentP1(orgRow.id);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
