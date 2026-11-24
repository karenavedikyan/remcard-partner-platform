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
    assert.equal(guest.steps[2].title, "Выдайте первый сертификат");

    // The real profile wins over the advisory type on the link.
    const agentViewer = buildInviteLandingCopy(pendingPreview({ intendedPartnerType: "MASTER" }), {
      partnerType: "STORE",
      partnerActivities: ["AGENT"],
    });
    assert.equal(agentViewer.agentRecipient, true);
    assert.equal(agentViewer.mutual, null);

    const masterViewer = buildInviteLandingCopy(pendingPreview({ intendedPartnerType: "AGENT" }), {
      partnerType: "MASTER",
      partnerActivities: ["SERVICE"],
    });
    assert.equal(masterViewer.agentRecipient, false);
    assert.notEqual(masterViewer.mutual, null);
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
    assert.match(person.steps[2].hint, /Иван Петров сможет рекомендовать и вас/);
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
