type CheckInHubStripTitleProps = {
  todayDailyDone: boolean;
  streak: number;
};

export function CheckInHubStripTitle({ todayDailyDone, streak }: CheckInHubStripTitleProps) {
  if (todayDailyDone && streak > 0) {
    return (
      <>
        연속{" "}
        <span className="check-in-hub-status__headline-value corp-trust-gradient-text">{streak}</span>
        <span className="corp-trust-gradient-text">일</span>
      </>
    );
  }

  return <>오늘</>;
}
