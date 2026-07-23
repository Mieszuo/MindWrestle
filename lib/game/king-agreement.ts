function lower(text: string) {
  return text.toLowerCase();
}

/** Reject gate refusals — "nie otworzę bramy" must not count as agreement. */
function kingGateRefusal(reply: string): boolean {
  return (
    /\bnie\s+(otworz|otworzę|otwier|wpuszcz|pozwol|chc[eę]|zamierzam\s+otworz).{0,35}bram/.test(reply) ||
    /\bbram[aęy]?.{0,35}(pozostan|pozostaje|zostanie|zamkni|zamknięt|nie\s+otwor|nie\s+wpuszcz)/.test(reply) ||
    /\bnie\s+(otworz|otwier|wpuszcz).{0,15}(nikt|nikogo|cię|ciebie|wędrowc)/.test(reply)
  );
}

function kingGateAgreement(reply: string): boolean {
  return (
    /niech.{0,24}bram.{0,30}(otworz|stanie|wpuszcz|będzie\s+otwor|otwart)/.test(reply) ||
    /(otworz[eę]|otwieram|otwarcie|otworz|otwart).{0,28}bram/.test(reply) ||
    /bram[aęy]?.{0,24}(otworz[eę]|otworzym|otwarc|stanie\s+otwor|będzie\s+otwor|zostan[aą]\s+otwart|otwart)/.test(reply) ||
    /wpuszcz[eę].{0,28}bram/.test(reply) ||
    /dost[eę]p.{0,20}bram/.test(reply)
  );
}

export function kingAgreementMet(message: string): boolean {
  const reply = lower(message);
  if (!/bram/.test(reply)) return false;
  if (kingGateRefusal(reply)) return false;
  return kingGateAgreement(reply);
}
