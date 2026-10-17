/* Made-up sample chats for store screenshots (Fern & Fade Studio is the demo's fictional salon). Runs in the demo page. */
module.exports = function seed(){
  const now = Date.now(), m = 60000, id = () => Math.random().toString(36).slice(2, 9);
  const sat = new Date(); sat.setDate(sat.getDate() + ((6 - sat.getDay() + 7) % 7 || 7)); sat.setHours(11, 0, 0, 0);
  const tue = new Date(sat); tue.setDate(sat.getDate() + 3); tue.setHours(15, 30, 0, 0);
  const dis = {from:"system", text:"You're texting Fern & Fade Studio's automated assistant. Ask for a person anytime."};
  const mk = (name, phone, status, mins, msgs, extra) => ({id:id(), name, phone, status, example:true, createdAt:now - mins*m, updatedAt:now - (mins - msgs.length)*m,
    booked:false, handoffReason:"", msgs:[dis, ...msgs].map((x, i) => ({id:id(), t:now - (mins - i)*m, ...x})), ...extra});
  const jordan = mk("Jordan Lee", "(555) 010-2231", "ai", 18, [
    {from:"customer", text:"Hi! Any openings Saturday for a cut and style?"},
    {from:"ai", text:"Yes! Here's what's open for women's cut & style (60 min, $75):", widget:{type:"slots", serviceId:"cut"}},
    {from:"customer", text:"Sat 11:00 AM"},
    {from:"ai", text:"Perfect. Just a few details to hold it:", widget:{type:"intake", serviceId:"cut"}},
    {from:"customer", text:"Jordan Lee · (555) 010-2231"},
    {from:"ai", text:"Thanks Jordan! A $20 deposit holds your spot and goes toward the visit.", widget:{type:"deposit", serviceId:"cut"}},
    {from:"customer", text:"Paid $20 deposit"},
    {from:"ai", text:"You're booked! See you Saturday at 11:00 AM. Reply here anytime to change it.", widget:{type:"confirm"}}], {booked:true});
  const sam = mk("Sam Rivera", "(555) 010-7714", "needs_human", 6, [
    {from:"customer", text:"My color from last week is already fading and patchy. I'm pretty upset."},
    {from:"ai", text:"I'm sorry about that, Sam. I'm bringing in Maya from our team, she'll reply here shortly."},
    {from:"system", text:"Front desk notified"}], {handoffReason:"Upset customer, color issue"});
  const priya = mk("Priya Shah", "", "ai", 3, [
    {from:"customer", text:"Do you do men's cuts on Sundays?"},
    {from:"ai", text:"We're closed Sundays. Saturday has men's cuts open at 10:30 AM and 2:00 PM. Want me to hold one?"}]);
  const chris = mk("Chris Moreno", "(555) 010-4410", "human", 40, [
    {from:"customer", text:"Can I bring my daughter for a cut at the same time as mine?"},
    {from:"ai", text:"Let me check with the team so you're both seen together."},
    {from:"system", text:"Maya from the front desk joined", staff:true},
    {from:"staff", text:"Hi Chris! Yes, I can put you both in at 3:30 Tuesday with two stylists. Want that?"},
    {from:"customer", text:"Perfect, thank you!"}]);
  for (const c of [sam, priya, jordan, chris]) S.convos[c.id] = c;
  const b1 = {id:id(), example:true, name:"Jordan Lee", phone:"(555) 010-2231", serviceId:"cut", serviceName:"Women's cut & style", minutes:60, price:75, deposit:20, start:sat.toISOString(), status:"booked"};
  const b2 = {id:id(), example:true, name:"Chris Moreno", phone:"(555) 010-4410", serviceId:"mens", serviceName:"Men's cut", minutes:30, price:40, deposit:0, start:tue.toISOString(), status:"booked"};
  const b3 = {id:id(), example:true, name:"Avery Kim", phone:"(555) 010-9032", serviceId:"blow", serviceName:"Blowout", minutes:45, price:50, deposit:0, start:new Date(sat.getTime() + 3*36e5).toISOString(), status:"booked"};
  const day = (n, h) => { const d = new Date(tue); d.setDate(tue.getDate() + n); d.setHours(h, 0, 0, 0); return d.toISOString(); };
  const more = [["Dana Brooks", "color", "Single-process color", 120, 140, 40, day(1, 10)], ["Luis Ortega", "mens", "Men's cut", 30, 40, 0, day(2, 12)],
    ["Taylor Nguyen", "cut", "Women's cut & style", 60, 75, 20, day(3, 16)]].map(([name, serviceId, serviceName, minutes, price, deposit, start]) =>
    ({id:id(), example:true, name, phone:"", serviceId, serviceName, minutes, price, deposit, start, status:"booked"}));
  for (const b of [b1, b2, b3, ...more]) S.bookings[b.id] = b;
  return {jordan:jordan.id, sam:sam.id, priya:priya.id, chris:chris.id};
};
