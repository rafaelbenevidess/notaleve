export {}
// Envia um evento do Asaas para o webhook local (sem precisar de túnel).
//   npx tsx scripts/simular-webhook-asaas.mts <subscriptionId> [PAYMENT_CONFIRMED|PAYMENT_OVERDUE|SUBSCRIPTION_DELETED]
const [sub, evento = 'PAYMENT_CONFIRMED'] = process.argv.slice(2)
if (!sub) { console.error('uso: simular-webhook-asaas.mts <subscriptionId> [evento]'); process.exit(1) }
const url = `${process.env.APP_URL ?? 'http://localhost:3000'}/api/webhooks/asaas`
const corpo = { event: evento, payment: { id: `pay_sim_${Date.now()}`, subscription: sub, status: 'CONFIRMED', dueDate: new Date().toISOString().slice(0, 10), value: 59.9 } }
const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'asaas-access-token': process.env.ASAAS_WEBHOOK_TOKEN ?? 'troque-este-token-local' }, body: JSON.stringify(corpo) })
console.log(r.status, await r.text())
