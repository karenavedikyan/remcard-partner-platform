import { describe, expect, it } from "vitest";
import {
  savedDirectionLabels,
  overviewRoleLabel,
  savedWorkingProfileReadyLabel,
  savedWorkingProfileTitle,
} from "./profile-overview-display";
import { isOrganizationStaffEmployee } from "./profile-staff-cabinet";
import type { ProProfileResponse } from "@/lib/types";

describe("profile-overview-display", () => {
  it("uses organization name for STORE, not user display name", () => {
    const profile: ProProfileResponse = {
      organization: {
        id: "o1",
        name: "Оптовик Юг",
        catalogStatus: "DRAFT",
        partnerType: "STORE",
        branchCount: 2,
      },
      programs: [],
      user: {
        id: "u1",
        publicId: "RC1",
        displayName: "Алексей",
        city: "Краснодар",
        specializations: [],
        role: "PRO",
        partnerType: "STORE",
        description: null,
        catalogStatus: "DRAFT",
        isPublic: false,
        rejectionReason: null,
        badges: [],
        photoUrl: null,
        storeCategories: ["doors"],
        areas: [],
        website: null,
        telegram: null,
        whatsapp: null,
        instagram: null,
        vk: null,
        max: null,
        yandex: null,
        publicEmail: null,
        publicPhone: null,
        showFullName: false,
      },
    };
    expect(savedWorkingProfileTitle(profile)).toBe("Оптовик Юг");
  });

  it("does not mark incomplete saved profile as ready", () => {
    const incomplete: ProProfileResponse = {
      organization: null,
      programs: [],
      user: {
        id: "u2",
        publicId: "RC2",
        displayName: "И",
        city: "",
        specializations: [],
        role: "PRO",
        partnerType: "MASTER",
        description: null,
        catalogStatus: "DRAFT",
        isPublic: false,
        rejectionReason: null,
        badges: [],
        photoUrl: null,
        storeCategories: [],
        areas: [],
        website: null,
        telegram: null,
        whatsapp: null,
        instagram: null,
        vk: null,
        max: null,
        yandex: null,
        publicEmail: null,
        publicPhone: null,
        showFullName: false,
      },
    };
    expect(savedWorkingProfileReadyLabel(incomplete).ready).toBe(false);
  });

  it("labels MASTER trade and L1 ids in Russian", () => {
    const profile: ProProfileResponse = {
      organization: null,
      programs: [],
      user: {
        id: "u3",
        publicId: "RC3",
        displayName: "Мастер",
        city: "Москва",
        specializations: ["plumbing", "L1-9"],
        role: "PRO",
        partnerType: "MASTER",
        description: null,
        catalogStatus: "DRAFT",
        isPublic: false,
        rejectionReason: null,
        badges: [],
        photoUrl: null,
        storeCategories: [],
        areas: [],
        website: null,
        telegram: null,
        whatsapp: null,
        instagram: null,
        vk: null,
        max: null,
        yandex: null,
        publicEmail: null,
        publicPhone: null,
        showFullName: false,
      },
    };
    expect(savedDirectionLabels(profile)).toEqual(["Сантехника", "Чистовая отделка"]);
  });

  it("staff CLIENT without partnerType shows organization, not MASTER", () => {
    const profile: ProProfileResponse = {
      organization: {
        id: "o1",
        name: "ОПТОВИК",
        catalogStatus: "DRAFT",
        partnerType: "STORE",
        branchCount: 6,
      },
      programs: [],
      user: {
        id: "u-staff",
        publicId: "RC-ST",
        displayName: "Сергей",
        city: "Краснодар",
        specializations: [],
        role: "CLIENT",
        partnerType: null,
        description: null,
        catalogStatus: "DRAFT",
        isPublic: false,
        rejectionReason: null,
        badges: [],
        photoUrl: null,
        storeCategories: [],
        areas: [],
        website: null,
        telegram: null,
        whatsapp: null,
        instagram: null,
        vk: null,
        max: null,
        yandex: null,
        publicEmail: null,
        publicPhone: null,
        showFullName: false,
      },
    };
    const ctx = {
      role: "BRANCH_EMPLOYEE",
      organization: { id: "o1", name: "ОПТОВИК" },
      membershipKind: "HEAD_OFFICE",
      membershipPosition: "руководитель отдела розничных продаж",
      branches: [{ id: "b1", name: "F1", city: "C" }],
    };
    expect(savedWorkingProfileTitle(profile, ctx)).toBe("ОПТОВИК");
    expect(savedWorkingProfileReadyLabel(profile, ctx).label).toBe("Доступ по приглашению");
    expect(overviewRoleLabel(profile, ctx)).toContain("Штаб");
    expect(isOrganizationStaffEmployee(profile, ctx)).toBe(true);
  });

  it("CLIENT with partnerType=null but no org membership is not treated as staff", () => {
    const profile: ProProfileResponse = {
      organization: null,
      programs: [],
      user: {
        id: "u-new",
        publicId: "RC-NEW",
        displayName: "New",
        city: "",
        specializations: [],
        role: "CLIENT",
        partnerType: null,
        description: null,
        catalogStatus: "DRAFT",
        isPublic: false,
        rejectionReason: null,
        badges: [],
        photoUrl: null,
        storeCategories: [],
        areas: [],
        website: null,
        telegram: null,
        whatsapp: null,
        instagram: null,
        vk: null,
        max: null,
        yandex: null,
        publicEmail: null,
        publicPhone: null,
        showFullName: false,
      },
    };
    expect(isOrganizationStaffEmployee(profile, { role: "SOLO_PARTNER", organization: null })).toBe(
      false,
    );
  });
});
