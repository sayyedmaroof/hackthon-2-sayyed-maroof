import postgres from 'postgres'
const url = process.env.DATABASE_URL
const sql = postgres(url, { max: 1 })
const rows = await sql`select id, reference, status, total_cents, subtotal_cents, currency, checkout_generations, left(coalesce(stripe_session_id,''), 22) as session, customer_email, created_at from orders order by created_at desc limit 5`
console.log(JSON.stringify(rows, null, 1))
await sql.end()
