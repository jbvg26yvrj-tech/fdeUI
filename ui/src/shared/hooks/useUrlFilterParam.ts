import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useCallback } from 'react';

export function useUrlFilterParam(paramName: string): [string | null, () => void] {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const prevParamRef = useRef<string | null>(null);
  const paramValue = searchParams.get(paramName);

  useEffect(() => {
    prevParamRef.current = paramValue;
  }, [paramValue]);

  const clearParam = useCallback(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete(paramName);
    navigate(`?${newParams.toString()}`, { replace: true });
  }, [navigate, paramName, searchParams]);

  return [paramValue, clearParam];
}
