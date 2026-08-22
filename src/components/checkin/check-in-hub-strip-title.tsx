type CheckInHubStripTitleProps = {
  todayDailyDone: boolean;
  streak: number;
};

export function CheckInHubStripTitle({ todayDailyDone, streak }: CheckInHubStripTitleProps) {
  if (todayDailyDone && streak > 0) {
    return (
      <>
        연속 <em>{streak}</em>일
      </>
    );
  }

  return <>오늘의 회복</>;
}
