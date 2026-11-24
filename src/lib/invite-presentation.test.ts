import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDiscussionInviteCopy,
  buildInviteLandingCopy,
  buildInviteLinkMetadata,
  buildInviteShareMessage,
  formatInviteAudienceLabel,
  inviteOgDescription,
  inviterDisplayName,
  resolveInviteAudience,
  resolveInviteDirection,
} from "./invite-presentation.ts";
import type { LinkInvitePublicPreview } from "./link-invite-public.ts";

function pendingPreview(
  overrides: Partial<LinkInvitePublicPreview> = {},
): LinkInvitePublicPreview {
  return {
    status: "PENDING",
    inviter: {
      displayName: "ОПТОВИК",
      partnerType: "STORE",
      city: "Краснодар",
    },
    intendedPartnerType: null,
    terms: [{ category: "doors", categoryLabel: "doors", storePercent: 10, isExcluded: false }],
    ...overrides,
  };
}

/** Page titles carry non-breaking spaces; the wording is compared without them. */
const plain = (text: string) => text.replace(/\u00a0/g, " ");

describe("invite presentation", () => {
  it("tells a store's invitee to recommend the store, with the mutual offer", () => {
    assert.equal(resolveInviteAudience("STORE", null), "master");
    const copy = buildInviteLandingCopy(pendingPreview());
    assert.equal(copy.direction, "recipient_recommends");
    assert.equal(copy.headline, "ОПТОВИК приглашает вас в партнёры");
    assert.equal(copy.senderLine, "Магазин · Краснодар");
    assert.equal(
      copy.lead,
      "Рекомендуйте магазин «ОПТОВИК» своим клиентам и получайте вознаграждение с их покупок.",
    );
    assert.deepEqual(copy.flow, [
      "Выдаёте клиенту сертификат на скидку",
      "Клиент покупает у магазина «ОПТОВИК»",
      "Вы получаете вознаграждение",
    ]);
    assert.equal(copy.termsTitle, "Условия магазина «ОПТОВИК»");
    assert.match(copy.percentExplainer, /ваше вознаграждение/);
    assert.match(copy.mutual?.text ?? "", /ОПТОВИК тоже сможет приводить клиентов вам/);
    assert.deepEqual(
      copy.steps.map((step) => step.title),
      ["Войдите или зарегистрируйтесь", "Примите условия", "Предложите свои условия"],
    );
    assert.equal(formatInviteAudienceLabel(null, "STORE"), "Для специалистов");
  });

  it("hides the mutual offer and points an agent recipient to the first certificate", () => {
    const guest = buildInviteLandingCopy(pendingPreview({ intendedPartnerType: "AGENT" }));
    assert.equal(guest.agentRecipient, true);
    assert.equal(guest.direction, "recipient_recommends");
    assert.equal(guest.mutual, null);
    assert.equal(plain(guest.headline), "Приводите клиентов в «ОПТОВИК» и получайте процент");
    assert.equal(guest.senderLine, "Магазин · Краснодар");
    assert.equal(
      guest.lead,
      "Клиенту — скидка, вам — вознаграждение с каждой его покупки. Ничего продавать не нужно.",
    );
    assert.deepEqual(guest.steps[2], {
      title: "Отправьте клиенту сертификат",
      hint: "Он купит — вам придёт вознаграждение.",
    });

    // The real profile wins over the advisory type on the link.
    const agentViewer = buildInviteLandingCopy(pendingPreview({ intendedPartnerType: "MASTER" }), {
      partnerType: "STORE",
      partnerActivities: ["AGENT"],
    });
    assert.equal(agentViewer.agentRecipient, true);
    assert.equal(agentViewer.mutual, null);

    // A link made for agents keeps the agent wording for a company that also acts as an agent.
    const companyViewer = buildInviteLandingCopy(
      pendingPreview({
        inviter: { displayName: "ОПТОВИК", partnerType: "COMPANY", city: "Краснодар" },
        intendedPartnerType: "AGENT",
      }),
      { partnerType: "COMPANY", partnerActivities: ["STORE", "AGENT"] },
    );
    assert.equal(companyViewer.agentRecipient, true);
    assert.equal(companyViewer.mutual, null);
    assert.equal(plain(companyViewer.headline), "Приводите клиентов в «ОПТОВИК» и получайте процент");
    assert.equal(companyViewer.steps[2].title, "Отправьте клиенту сертификат");
    assert.doesNotMatch(JSON.stringify(companyViewer), /обмениваться|в обе стороны|процент на услуги/);

    const masterViewer = buildInviteLandingCopy(pendingPreview({ intendedPartnerType: "AGENT" }), {
      partnerType: "MASTER",
      partnerActivities: ["SERVICE"],
    });
    assert.equal(masterViewer.agentRecipient, true);
    assert.equal(masterViewer.mutual, null);

    // The same account on a link made for companies still gets the two-way offer.
    const companyOnCompanyLink = buildInviteLandingCopy(
      pendingPreview({
        inviter: { displayName: "ОПТОВИК", partnerType: "COMPANY", city: "Краснодар" },
        intendedPartnerType: "COMPANY",
      }),
      { partnerType: "COMPANY", partnerActivities: ["STORE", "AGENT"] },
    );
    assert.equal(companyOnCompanyLink.agentRecipient, false);
    assert.notEqual(companyOnCompanyLink.mutual, null);

    // A store opening an agent link from a company: the server reverses the sides, so no agent promise.
    const storeViewer = buildInviteLandingCopy(
      pendingPreview({
        inviter: { displayName: "ОПТОВИК", partnerType: "COMPANY", city: "Краснодар" },
        intendedPartnerType: "AGENT",
      }),
      { partnerType: "STORE", partnerActivities: ["STORE"] },
    );
    assert.equal(storeViewer.direction, "neutral");
    assert.equal(storeViewer.agentRecipient, false);
  });

  it("never promises a direction the server may reverse on acceptance", () => {
    // Specialist or company invites a store: the store becomes the selling side.
    assert.equal(resolveInviteDirection("MASTER", "STORE"), "neutral");
    assert.equal(resolveInviteDirection("COMPANY", "STORE"), "neutral");
    // Recipient type unknown until login.
    assert.equal(resolveInviteDirection("COMPANY", null), "neutral");
    assert.equal(resolveInviteDirection(null, null), "neutral");
    // Logged-in store overrides the advisory "MASTER" on the link.
    assert.equal(
      resolveInviteDirection("COMPANY", "MASTER", { partnerType: "STORE", partnerActivities: ["STORE"] }),
      "neutral",
    );
    // Cases the server always resolves as "recipient recommends".
    assert.equal(resolveInviteDirection("STORE", "STORE"), "recipient_recommends");
    assert.equal(resolveInviteDirection("COMPANY", "MASTER"), "recipient_recommends");
    assert.equal(resolveInviteDirection("MASTER", "COMPANY"), "recipient_recommends");
    assert.equal(resolveInviteDirection("MASTER", "AGENT"), "recipient_recommends");

    const copy = buildInviteLandingCopy(
      pendingPreview({
        inviter: { displayName: "Иван", partnerType: "MASTER", city: null },
        intendedPartnerType: "STORE",
      }),
    );
    assert.equal(copy.direction, "neutral");
    assert.equal(copy.mutual, null);
    assert.equal(copy.termsTitle, "Условия предложения");
    assert.equal(copy.senderLine, "Специалист");
    const text = [copy.lead, ...copy.flow, copy.percentExplainer].join(" ");
    assert.doesNotMatch(text, /Вы получаете|ваше вознаграждение|Вы платите/);
    assert.equal(formatInviteAudienceLabel("STORE", "MASTER"), "Для магазинов");
    assert.match(inviteOgDescription("MASTER", "STORE"), /Продажи по рекомендациям/);
  });

  it("keeps sender names undeclined and does not double quotes", () => {
    const company = buildInviteLandingCopy(
      pendingPreview({
        inviter: { displayName: "ООО «Ромашка»", partnerType: "COMPANY", city: null },
        intendedPartnerType: "MASTER",
      }),
    );
    assert.equal(company.termsTitle, "Условия компании ООО «Ромашка»");
    assert.equal(company.noteCaption, "Сообщение от компании ООО «Ромашка»");
    const person = buildInviteLandingCopy(
      pendingPreview({
        inviter: { displayName: "Иван Петров", partnerType: "MASTER", city: "Сочи" },
        intendedPartnerType: "MASTER",
      }),
    );
    assert.equal(person.flow[1], "Клиент покупает у партнёра");
    assert.equal(person.senderLine, "Специалист · Сочи");
    assert.equal(person.headline, "Иван Петров приглашает вас в партнёры");
    assert.equal(
      person.lead,
      "Советуйте партнёра тем, с кем работаете на объекте: им скидка, вам вознаграждение.",
    );
    assert.equal(person.steps[2].hint, "Тогда Иван Петров начнёт приводить вам заказчиков.");
    assert.match(person.mutual?.text ?? "", /^Иван Петров может советовать вас своим клиентам\./);
    assert.equal(
      company.lead,
      "Советуйте компанию ООО «Ромашка» тем, с кем работаете на объекте: им скидка, вам вознаграждение.",
    );
  });

  it("words the offer for the recipient's own partner type", () => {
    const specialist = buildInviteLandingCopy(pendingPreview({ intendedPartnerType: "MASTER" }));
    assert.equal(
      plain(specialist.headline),
      "Ваши клиенты покупают материалы — получайте с этого процент",
    );
    // No dash or one-letter word is left alone at a line break.
    assert.equal(
      specialist.headline,
      "Ваши клиенты покупают материалы\u00a0— получайте с\u00a0этого процент",
    );
    // The headline does not name the sender, so the line under it does.
    assert.equal(specialist.senderLine, "ОПТОВИК · Магазин · Краснодар");
    assert.equal(
      specialist.lead,
      "Советуйте «ОПТОВИК» тем, с кем работаете на объекте: им скидка, вам вознаграждение.",
    );
    assert.equal(
      specialist.mutual?.text,
      "ОПТОВИК может советовать вас своим покупателям. Укажите процент на свои услуги — и заказы пойдут к вам.",
    );
    assert.deepEqual(specialist.steps[2], {
      title: "Назовите свой процент",
      hint: "Тогда ОПТОВИК начнёт приводить вам заказчиков.",
    });

    const company = buildInviteLandingCopy(pendingPreview({ intendedPartnerType: "COMPANY" }));
    assert.equal(plain(company.headline), "ОПТОВИК предлагает обмениваться клиентами");
    assert.equal(company.senderLine, "Магазин · Краснодар");
    assert.equal(
      company.lead,
      "Ваши заказчики покупают в «ОПТОВИК» со скидкой, компания получает вознаграждение с каждой покупки.",
    );
    assert.equal(
      company.mutual?.text,
      "Покупателям «ОПТОВИК» нужны подрядчики. Предложите свой процент — и ОПТОВИК будет направлять их к вам.",
    );
    assert.deepEqual(company.steps[2], {
      title: "Укажите процент на услуги компании",
      hint: "Так вы получите заказчиков от «ОПТОВИК».",
    });

    const store = buildInviteLandingCopy(pendingPreview({ intendedPartnerType: "STORE" }));
    assert.equal(plain(store.headline), "ОПТОВИК предлагает обмениваться покупателями");
    assert.equal(
      store.lead,
      "Вашим покупателям нужно то, чего нет у вас. Направляйте их в «ОПТОВИК»: им скидка, вам вознаграждение.",
    );
    assert.equal(
      store.mutual?.text,
      "Предложите свой процент — и ОПТОВИК будет направлять своих покупателей к вам.",
    );
    assert.deepEqual(store.steps[2], {
      title: "Назовите процент на свои товары",
      hint: "Так вы получите покупателей от «ОПТОВИК».",
    });

    // Shared parts do not depend on the recipient type.
    for (const copy of [specialist, company, store]) {
      assert.equal(copy.direction, "recipient_recommends");
      assert.equal(copy.termsTitle, "Условия магазина «ОПТОВИК»");
      assert.deepEqual(copy.flow, [
        "Выдаёте клиенту сертификат на скидку",
        "Клиент покупает у магазина «ОПТОВИК»",
        "Вы получаете вознаграждение",
      ]);
      assert.equal(copy.mutual?.title, "Можно в обе стороны");
    }

    // The logged-in profile decides, not the advisory type on the link.
    const viewerCompany = buildInviteLandingCopy(pendingPreview({ intendedPartnerType: "MASTER" }), {
      partnerType: "COMPANY",
      partnerActivities: ["SERVICE"],
    });
    assert.equal(plain(viewerCompany.headline), "ОПТОВИК предлагает обмениваться клиентами");
  });

  it("adapts the wording when the sender is not a store or carries its own quotes", () => {
    const fromCompany = buildInviteLandingCopy(
      pendingPreview({
        inviter: { displayName: "СтройДом", partnerType: "COMPANY", city: null },
        intendedPartnerType: "COMPANY",
      }),
    );
    assert.equal(plain(fromCompany.headline), "СтройДом предлагает обмениваться клиентами");
    assert.equal(
      fromCompany.mutual?.text,
      "СтройДом может советовать вас своим клиентам. Укажите процент на свои услуги — и заказы пойдут к вам.",
    );
    assert.equal(fromCompany.steps[2].hint, "Так вы получите заказчиков от «СтройДом».");

    const fromPerson = buildInviteLandingCopy(
      pendingPreview({
        inviter: { displayName: "Иван Петров", partnerType: "MASTER", city: null },
        intendedPartnerType: "COMPANY",
      }),
    );
    assert.equal(
      fromPerson.lead,
      "Ваши заказчики покупают у партнёра со скидкой, компания получает вознаграждение с каждой покупки.",
    );
    assert.equal(fromPerson.steps[2].hint, "Тогда Иван Петров начнёт приводить вам заказчиков.");

    const agentFromPerson = buildInviteLandingCopy(
      pendingPreview({
        inviter: { displayName: "Иван Петров", partnerType: "MASTER", city: null },
        intendedPartnerType: "AGENT",
      }),
    );
    assert.equal(agentFromPerson.headline, "Иван Петров приглашает вас в партнёры");

    const quotedStore = buildInviteLandingCopy(
      pendingPreview({
        inviter: { displayName: "Салон «Уют»", partnerType: "STORE", city: null },
        intendedPartnerType: "AGENT",
      }),
    );
    assert.equal(plain(quotedStore.headline), "Приводите клиентов в магазин Салон «Уют» и получайте процент");
    const quotedForStore = buildInviteLandingCopy(
      pendingPreview({
        inviter: { displayName: "Салон «Уют»", partnerType: "STORE", city: null },
        intendedPartnerType: "COMPANY",
      }),
    );
    assert.match(quotedForStore.lead, /покупают в магазине Салон «Уют» со скидкой/);
    assert.match(quotedForStore.mutual?.text ?? "", /^Покупателям магазина Салон «Уют» нужны подрядчики/);
  });

  it("uses the agent mechanic for discussion links only when the server marks an agent", () => {
    const agent = buildDiscussionInviteCopy({
      inviter: { displayName: "Алексей Романов", partnerType: null, city: "Краснодар", isAgent: true },
    });
    assert.equal(agent.headline, "Алексей Романов хочет приводить вам клиентов");
    assert.equal(agent.senderLine, "Агент · Краснодар");
    assert.deepEqual(agent.flow, [
      "Алексей Романов выдаёт клиенту сертификат",
      "Клиент покупает у вас со скидкой",
      "Вы платите процент с покупки",
    ]);
    assert.equal(agent.steps[1].title, "Присоединитесь к обсуждению");
    assert.equal(agent.finePrint, "Процент пока не согласован: его предлагаете вы.");

    for (const inviter of [
      { displayName: "Иван", partnerType: "MASTER", city: null, isAgent: false },
      { displayName: "Иван", partnerType: "MASTER", city: null },
    ]) {
      const neutral = buildDiscussionInviteCopy({ inviter });
      assert.equal(neutral.fromAgent, false);
      assert.equal(neutral.headline, "Иван приглашает обсудить сотрудничество");
      assert.doesNotMatch([neutral.lead, ...neutral.flow].join(" "), /Вы платите|у вас/);
    }
  });

  it("builds active metadata with inviter in title", () => {
    const meta = buildInviteLinkMetadata({
      preview: pendingPreview(),
      pageUrl: "https://prof.example/invite/abc",
      ogImageUrl: "https://prof.example/invite/opengraph-image",
    });
    assert.match(String(meta.title), /ОПТОВИК приглашает/);
    assert.equal(meta.openGraph?.type, "website");
    assert.equal(meta.openGraph?.locale, "ru_RU");
    assert.equal(meta.twitter?.card, "summary_large_image");
    assert.equal(meta.openGraph?.images?.[0]?.url, "https://prof.example/invite/opengraph-image");
    assert.equal(typeof meta.robots === "object" && meta.robots !== null && "index" in meta.robots && meta.robots.index, false);
    assert.equal(meta.referrer, "no-referrer");
  });

  it("uses neutral metadata for expired invites", () => {
    const meta = buildInviteLinkMetadata({
      preview: { status: "EXPIRED" },
      pageUrl: "https://prof.example/invite/x",
      ogImageUrl: "https://prof.example/invite/opengraph-image",
    });
    assert.match(String(meta.title), /Срок приглашения истёк/);
    assert.doesNotMatch(String(meta.description), /вознагражден/i);
  });

  it("uses the same branded chat card for discussion invites without private details", () => {
    const ogImageUrl = "https://prof.example/invite/opengraph-image";
    const pageUrl = "https://prof.example/invite/discussion/abc";
    const meta = buildInviteLinkMetadata({
      kind: "discussion",
      preview: pendingPreview({ note: "Не публиковать" }),
      pageUrl,
      ogImageUrl,
    });
    assert.equal(meta.openGraph?.title, "ОПТОВИК приглашает вас к сотрудничеству");
    assert.equal(meta.openGraph?.url, pageUrl);
    assert.equal(meta.openGraph?.images?.[0]?.url, ogImageUrl);
    assert.deepEqual(meta.twitter?.images, [ogImageUrl]);
    assert.doesNotMatch(JSON.stringify(meta), /Не публиковать|doors|Краснодар/);
    const used = buildInviteLinkMetadata({ kind: "discussion", preview: { status: "JOINED" }, pageUrl, ogImageUrl });
    assert.equal(used.openGraph?.title, "Приглашение уже принято");
  });

  it("builds share message with inviter name and optional benefit line", () => {
    const url = "https://prof.example/invite/tok";
    const storeMsg = buildInviteShareMessage({
      inviterName: "ОПТОВИК",
      url,
      inviterType: "STORE",
    });
    assert.match(storeMsg, /ОПТОВИК/);
    assert.ok(storeMsg.includes(url));
    assert.match(storeMsg, /скидку по вашей рекомендации/);
  });

  it("falls back inviter display name", () => {
    assert.equal(inviterDisplayName({ status: "PENDING" }), "Партнёр RemCard");
  });

});
