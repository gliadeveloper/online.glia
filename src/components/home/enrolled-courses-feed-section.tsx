import {
  HomeFeedPanel,
  HomeFeedPanelHeader,
  HomeFeedPanelList,
  HomeFeedRow,
  HomeFeedRowMedia,
} from "@/components/home/home-feed-panel";
import { getUserEnrollments } from "@/lib/learning-enrollments";

type EnrolledCoursesFeedSectionProps = {
  userId: string;
  limit?: number;
};

export async function EnrolledCoursesFeedSection({
  userId,
  limit = 3,
}: EnrolledCoursesFeedSectionProps) {
  const enrollments = await getUserEnrollments(userId);
  const active = enrollments.filter((item) => item.status === "ACTIVE").slice(0, limit);

  if (active.length === 0) {
    return null;
  }

  const headingId = "home-enrolled-courses-heading";

  return (
    <HomeFeedPanel aria-labelledby={headingId}>
      <HomeFeedPanelHeader title="수강중 강좌" titleId={headingId} moreHref="/learning" />
      <HomeFeedPanelList>
        {active.map((enrollment) => {
          const totalLessons = enrollment.course.modules.reduce(
            (sum, module) => sum + module._count.lessons,
            0,
          );
          const completedLessons = enrollment.progress.filter(
            (item) => item.status === "COMPLETED",
          ).length;
          const progressPercent = Math.round(enrollment.progressPercent);

          return (
            <HomeFeedRow
              key={enrollment.id}
              href={`/learning/${enrollment.course.id}`}
              title={enrollment.course.title}
              subtitle={`${completedLessons}/${totalLessons} · ${progressPercent}%`}
              leading={
                <HomeFeedRowMedia
                  label={enrollment.course.title}
                  imageUrl={enrollment.course.thumbnailUrl}
                />
              }
            />
          );
        })}
      </HomeFeedPanelList>
    </HomeFeedPanel>
  );
}
