namespace Huminex.ModuleContracts.OpenHuman;

public sealed record ScheduleInterviewRequest(Guid CandidateId, string Role, DateTime ScheduledAtUtc, string Mode);
public sealed record InterviewSummaryDto(Guid InterviewId, Guid CandidateId, string Role, DateTime ScheduledAtUtc, string Status, decimal? Score);
public sealed record RescheduleInterviewRequest(DateTime ScheduledAtUtc);
public sealed record InterviewScorecardDto(Guid InterviewId, decimal Technical, decimal Communication, decimal Behavioral, decimal Overall);
public sealed record InterviewTranscriptDto(Guid InterviewId, string TranscriptUrl);
public sealed record InterviewRecordingDto(Guid InterviewId, string RecordingUrl, DateTime RetentionUntilUtc);
public sealed record InterviewExportResponse(Guid InterviewId, string ExportUrl);
