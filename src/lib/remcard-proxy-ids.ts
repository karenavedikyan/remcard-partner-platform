/** Safe single path segment for branch / invite ids (CUID, legacy br_*). */
export const RESOURCE_ID_SEGMENT = "[a-zA-Z0-9_-]{1,128}";

export function branchByIdPath(prefix = "/api/pro/organization/branches"): RegExp {
  return new RegExp(`^${prefix.replace(/\//g, "\\/")}\\/${RESOURCE_ID_SEGMENT}$`);
}

export function branchSubPath(suffix: string): RegExp {
  return new RegExp(
    `^\\/api\\/pro\\/organization\\/branches\\/${RESOURCE_ID_SEGMENT}${suffix.replace(/\//g, "\\/")}$`,
  );
}

export function inviteByIdPath(): RegExp {
  return new RegExp(`^\\/api\\/pro\\/invites\\/${RESOURCE_ID_SEGMENT}$`);
}

export function proEmployeeByIdPath(): RegExp {
  return new RegExp(`^\\/api\\/pro\\/employees\\/${RESOURCE_ID_SEGMENT}$`);
}

export function branchEmployeeByIdPath(): RegExp {
  return new RegExp(
    `^\\/api\\/pro\\/organization\\/branches\\/${RESOURCE_ID_SEGMENT}\\/employees\\/${RESOURCE_ID_SEGMENT}$`,
  );
}

export function branchEmployeeTransferPath(): RegExp {
  return new RegExp(
    `^\\/api\\/pro\\/organization\\/branches\\/${RESOURCE_ID_SEGMENT}\\/employees\\/${RESOURCE_ID_SEGMENT}\\/transfer$`,
  );
}
