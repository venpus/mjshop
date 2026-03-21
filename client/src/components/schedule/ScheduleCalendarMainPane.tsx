import type { ReactNode } from "react";
import { cn } from "../ui/utils";

type Props = {
  children: ReactNode;
  className?: string;
};

/** 일정 페이지 본문에서 달력이 남는 세로 공간을 채울 때 사용 */
export function ScheduleCalendarMainPane({ children, className }: Props) {
  return <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", className)}>{children}</div>;
}
