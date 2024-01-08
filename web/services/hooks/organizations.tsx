import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { useQuery } from "@tanstack/react-query";
import { Members } from "../../pages/api/organization/[id]/members";
import { Owner } from "../../pages/api/organization/[id]/owner";
import { Database } from "../../supabase/database.types";
import { useCallback, useEffect, useState } from "react";
import Cookies from "js-cookie";
import { OrgContextValue } from "../../components/shared/layout/organizationContext";
import { ORG_ID_COOKIE_KEY } from "../../lib/constants";

const useGetOrgMembers = (orgId: string) => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["OrganizationsMembers", orgId],
    queryFn: async (query) => {
      const organizationId = query.queryKey[1];
      return fetch(`/api/organization/${organizationId}/members`).then(
        (res) => res.json() as Promise<Members>
      );
    },
    refetchOnWindowFocus: false,
  });
  return {
    data,
    isLoading,
    refetch,
  };
};

const useGetOrgOwner = (orgId: string) => {
  const { data, isLoading } = useQuery({
    queryKey: ["OrganizationsMembersOwner", orgId],
    queryFn: async (query) => {
      const organizationId = query.queryKey[1];
      return fetch(`/api/organization/${organizationId}/owner`).then(
        (res) => res.json() as Promise<Owner>
      );
    },
    refetchOnWindowFocus: false,
  });
  return {
    data,
    isLoading,
  };
};

const useGetOrgMembersAndOwner = (orgId: string) => {
  const { data: members, isLoading: isMembersLoading } =
    useGetOrgMembers(orgId);
  const { data: owner, isLoading: isOwnerLoading } = useGetOrgOwner(orgId);

  const isLoading = isMembersLoading || isOwnerLoading;

  const data = {
    owner,
    members,
  };

  return {
    data,
    isLoading,
  };
};

const useGetOrg = (orgId: string) => {
  const supabaseClient = useSupabaseClient<Database>();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["OrganizationsId", orgId],
    queryFn: async (query) => {
      if (!orgId) {
        return null;
      }
      const { data, error } = await supabaseClient
        .from("organization")
        .select(`*`)
        .eq("soft_delete", false)
        .eq("id", orgId)
        .single();
      return data;
    },
    refetchOnWindowFocus: false,
  });

  return {
    data,
    isLoading,
    refetch,
  };
};

const useGetOrgs = () => {
  const supabaseClient = useSupabaseClient<Database>();
  const user = useUser();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["Organizations", user?.id ?? ""],
    queryFn: async (query) => {
      if (!user?.id) {
        return [];
      }
      const { data, error } = await supabaseClient
        .from("organization")
        .select(`*`)
        .eq("soft_delete", false);
      if (error) {
        return [];
      }

      return data;
    },
    refetchOnWindowFocus: false,
  });

  data &&
    data.sort((a, b) => {
      if (a.name === b.name) {
        return a.id < b.id ? -1 : 1;
      }
      return a.name < b.name ? -1 : 1;
    });

  return {
    data,
    isLoading,
    refetch,
  };
};

const setOrgCookie = (orgId: string) => {
  Cookies.set(ORG_ID_COOKIE_KEY, orgId, { expires: 30 });
};

const useOrgsContextManager = () => {
  const user = useUser();
  const { data: orgs, refetch } = useGetOrgs();

  const [org, setOrg] = useState<NonNullable<typeof orgs>[number] | null>(null);
  const [renderKey, setRenderKey] = useState(0);
  const [isResellerOfCurrentCustomerOrg, setIsResellerOfCurrentOrg] =
    useState<boolean>(false);

  const refreshCurrentOrg = useCallback(() => {
    refetch().then((x) => {
      if (x.data && x.data.length > 0) {
        const firstOrg = x.data[0];
        setOrg(firstOrg);
        setOrgCookie(firstOrg.id);
        setRenderKey((key) => key + 1);
      }
    });
  }, [refetch]);

  useEffect(() => {
    if ((!orgs || orgs.length === 0) && user?.id) {
      fetch(`/api/user/${user.id}/ensure-one-org`).then((res) => {
        if (res.status === 201) {
          console.log("found orgs");
        } else if (res.status !== 200) {
          console.error("Failed to create org", res.json());
        } else {
          console.log(res.json());
          refreshCurrentOrg();
        }
      });
    }
  }, [orgs, user?.id, refreshCurrentOrg]);

  useEffect(() => {
    if (orgs && orgs.length > 0) {
      const orgIdFromCookie = Cookies.get(ORG_ID_COOKIE_KEY);
      const orgFromCookie = orgs.find((org) => org.id === orgIdFromCookie);
      if (!orgFromCookie) {
        Cookies.set(ORG_ID_COOKIE_KEY, orgs[0].id, { expires: 30 });
      }
      setOrg(orgFromCookie || orgs[0]);
    }
  }, [orgs]);

  useEffect(() => {
    setIsResellerOfCurrentOrg(
      !!(
        org?.organization_type === "customer" &&
        org.reseller_id &&
        orgs?.find((x) => x.id === org.reseller_id)
      )
    );
  }, [org?.organization_type, org?.reseller_id, orgs]);

  let orgContextValue: OrgContextValue | null = null;
  orgContextValue = {
    allOrgs: orgs ?? [],
    currentOrg: org ?? undefined,
    isResellerOfCurrentCustomerOrg,
    refreshCurrentOrg,
    setCurrentOrg: (orgId) => {
      refetch().then(() => {
        const org = orgs?.find((org) => org.id === orgId);
        if (org) {
          setOrg(org);
          setOrgCookie(org.id);
          setRenderKey((key) => key + 1);
        }
      });
    },
    renderKey,
    refetchOrgs: refetch,
  };

  return orgContextValue;
};

export {
  useGetOrgMembers,
  useGetOrgOwner,
  useGetOrgs,
  useOrgsContextManager,
  setOrgCookie,
  useGetOrg,
  useGetOrgMembersAndOwner,
};
