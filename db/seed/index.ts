import 'dotenv-flow/config';
import { seedOrgAndRoles } from './org-and-roles';
import { seedRfpMatrix } from './rfp-matrix';

async function main() {
  await seedOrgAndRoles();
  await seedRfpMatrix();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
