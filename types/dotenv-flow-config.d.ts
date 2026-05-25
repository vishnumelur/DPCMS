// dotenv-flow ships a `/config` side-effect entry point that loads .env*
// before any other module evaluates. Its types don't declare this subpath,
// so we declare it locally as an empty module.
declare module 'dotenv-flow/config';
