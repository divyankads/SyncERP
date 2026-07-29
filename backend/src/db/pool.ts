// PostgreSQL pool retired in favor of MongoDB Atlas
export const pool = {
  query: async () => ({ rows: [] }),
  connect: async () => ({ query: async () => ({ rows: [] }), release: () => {} }),
};
export default pool;
