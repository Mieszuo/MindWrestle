function lower(text: string) {
  return text.toLowerCase();
}

/** Strict check: Mila must admit fear/avoidance tied to the orchard wound — not vague poetic hesitation. */
export function milaConcessionMet(characterMessage: string, recentContext: string): boolean {
  const reply = lower(characterMessage);
  const context = lower(recentContext);

  const vagueDeflection =
    /nie każda historia|historia nie chce|nie od razu opowiedz|innym razem|później opowiem|jeszcze nie teraz/.test(
      reply,
    ) && !/(sad|sadu|sadem|tam.*(spad|czerw)|coś czerwonego|tam gdzie|jabł|jabl|owoc)/.test(reply);
  if (vagueDeflection) return false;

  const orchardInReply = /sad|sadu|sadem|owoc|jabł|jabl|czerwon|coś czerwonego|tam gdzie/.test(reply);
  const orchardEchoFromContext =
    /sad|sadu|sadem|owoc|jabł|jabl|czerwon/.test(context) &&
    /(tam gdzie|tamtym|to miejsce|w tamtym|o tamtym|o sadzie|o tym)/.test(reply);

  if (!orchardInReply && !orchardEchoFromContext) return false;

  const directAdmission =
    /boj[eę].*(sad|myśl|mówi|tam)|nie lubi[eę].*(mówi|myśl|tam|sad|o tym)|nie chc[eę].*(mówi|myśl|wraca|tam|sad|o tym)|strasz.*(sad|tam)|boli.*(sad|tam)|coś.*(złego|stało|stał|nieprzyjem).*(sad|tam)|nieprzyjem.*(sad|tam)/.test(
      reply,
    );

  const orchardMetaphorAdmission =
    (/czerwone.*spad|coś czerwonego spada|tam gdzie coś/.test(reply) &&
      /nie lubi[eę]|nie chc[eę]|trudno|boj|drż|płacz|ukryw|nie.*(mówi|opowiedz)|inaczej|dawno/.test(reply)) ||
    (/jabł|jabl|owoc/.test(reply) &&
      /nie chc[eę].*mówi|nie chc[eę] o tym|to było dawno|pachną inaczej|inaczej pachn/.test(reply));

  return directAdmission || orchardMetaphorAdmission;
}
