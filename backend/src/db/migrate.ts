import connectMongoDB from './mongo';

export async function migrate(): Promise<void> {
  await connectMongoDB();
  console.log('✅ MongoDB Atlas migration / connection ready.');
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Migration error:', err);
      process.exit(1);
    });
}

export default migrate;
