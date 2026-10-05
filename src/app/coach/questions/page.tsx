import { CoachLessonQuestions } from "@/components/coach/coach-lesson-questions";
import { requireCoach } from "@/lib/coach";
import { markLessonQuestionNotificationRead } from "@/lib/home-notifications";
import { listCoachLessonQuestions } from "@/lib/lesson-qna";

type CoachQuestionsPageProps = {
  searchParams: Promise<{ filter?: string; question?: string }>;
};

export default async function CoachQuestionsPage({ searchParams }: CoachQuestionsPageProps) {
  const user = await requireCoach();
  const { filter: filterParam, question } = await searchParams;
  const filter = filterParam === "all" ? "all" : "open";
  const questions = await listCoachLessonQuestions({ instructorId: user.id, filter });

  if (question && questions.some((item) => item.id === question)) {
    await markLessonQuestionNotificationRead(user.id, question);
  }

  return (
    <CoachLessonQuestions
      filter={filter}
      questions={questions}
      initialQuestionId={question && questions.some((item) => item.id === question) ? question : undefined}
    />
  );
}
