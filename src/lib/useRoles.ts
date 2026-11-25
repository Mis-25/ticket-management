"use client";

import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/apiClient";
import { listRoles } from "@/lib/userApi";
import { Role } from "@/types/role";

export function useRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesError, setRolesError] = useState("");

  useEffect(() => {
    let isActive = true;
    listRoles()
      .then((data) => isActive && setRoles(data))
      .catch((error) => isActive && setRolesError(errorMessage(error, "Could not load roles.")));
    return () => {
      isActive = false;
    };
  }, []);

  return { roles, rolesError };
}
