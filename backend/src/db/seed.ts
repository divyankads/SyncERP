import { seedMongoDB } from './seed-mongo';

export async function seed(): Promise<void> {
  await seedMongoDB();
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seed error:', err);
      process.exit(1);
    });
}

export default seed;
