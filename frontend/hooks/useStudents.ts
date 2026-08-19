"use client";

import { useState, useEffect, useCallback } from "react";
import { studentsApi } from "@/lib/api";
import type { Student } from "@/types";

export function useStudents(params: {
  search?: string;
  skip?: number;
  limit?: number;
  section?: string;
  academic_year?: number | "";
  dept_code?: string;
  status?: string;
}) {
  const [data, setData] = useState<{ total: number; items: Student[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    const queryParams: Record<string, string | number | boolean> = {};
    if (params.search) queryParams.search = params.search;
    if (params.skip !== undefined) queryParams.skip = params.skip;
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.section) queryParams.section = params.section;
    if (params.academic_year !== undefined && params.academic_year !== "") {
      queryParams.academic_year = params.academic_year;
    }
    if (params.dept_code) queryParams.dept_code = params.dept_code;
    if (params.status) queryParams.status = params.status;

    studentsApi
      .list(queryParams)
      .then(setData)
      .catch((e: unknown) => setError((e as Error).message))
      .finally(() => setIsLoading(false));
  }, [
    params.search,
    params.skip,
    params.limit,
    params.section,
    params.academic_year,
    params.dept_code,
    params.status,
    tick,
  ]);

  return { data, isLoading, error, refetch };
}
