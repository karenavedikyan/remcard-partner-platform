/**
 * Overview attention / KPI drill-down hrefs verified against route consumers in-repo.
 * - Partners registry: adminPartnersUrlFilters.registrationFromSearchParam ("active"|"demo")
 * - Moderation queue: AdminModerationClient searchParams (status, entityKind)
 */

/** AdminPartnersClient + registryFiltersFromSearchParams */
export const OVERVIEW_PARTNERS_ACTIVE_REGISTRY_HREF = "/admin/partners?registration=active";

/**
 * ManagementOverview.moderation.pendingPartners → partner moderation queue.
 * AdminModerationClient: entityKind "user" = partners; default status "PENDING".
 */
export const OVERVIEW_ATTENTION_MODERATION_PARTNERS_HREF =
  "/admin/moderation?status=PENDING&entityKind=user";

/** No /admin/leads (or equivalent) consumer in this FE tree — keep queue row non-navigable. */
export const OVERVIEW_ATTENTION_LEADS_HAS_ROUTE = false;

/** No supported registry filter for incompleteLiveRegistration — keep non-navigable. */
export const OVERVIEW_ATTENTION_INCOMPLETE_REGISTRATION_HAS_ROUTE = false;
