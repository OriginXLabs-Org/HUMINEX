using Asp.Versioning;
using Huminex.BuildingBlocks.Contracts.Api;
using Huminex.ModuleContracts.OpenHuman;
using Microsoft.AspNetCore.Mvc;

namespace Huminex.Api.Controllers;

/// <summary>
/// OpenHuman interview lifecycle APIs.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/openhuman/interviews")]
public sealed class OpenHumanController : ControllerBase
{
    /// <summary>
    /// Schedules a new interview session for a candidate.
    /// </summary>
    /// <param name="request">Interview scheduling payload.</param>
    /// <returns>Created interview summary.</returns>
    [HttpPost("schedule")]
    [ProducesResponseType(typeof(ApiEnvelope<InterviewSummaryDto>), StatusCodes.Status201Created)]
    public ActionResult<ApiEnvelope<InterviewSummaryDto>> Schedule([FromBody] ScheduleInterviewRequest request)
    {
        var interview = new InterviewSummaryDto(Guid.NewGuid(), request.CandidateId, request.Role, request.ScheduledAtUtc, "scheduled", null);
        return CreatedAtAction(nameof(GetById), new { id = interview.InterviewId }, new ApiEnvelope<InterviewSummaryDto>(interview, HttpContext.TraceIdentifier));
    }

    /// <summary>
    /// Lists interviews visible to the requester.
    /// </summary>
    /// <returns>Interview summary collection.</returns>
    [HttpGet]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyCollection<InterviewSummaryDto>>), StatusCodes.Status200OK)]
    public ActionResult<ApiEnvelope<IReadOnlyCollection<InterviewSummaryDto>>> GetAll()
    {
        IReadOnlyCollection<InterviewSummaryDto> items =
        [
            new(Guid.NewGuid(), Guid.NewGuid(), "Senior Engineer", DateTime.UtcNow.AddDays(1), "scheduled", null)
        ];
        return Ok(new ApiEnvelope<IReadOnlyCollection<InterviewSummaryDto>>(items, HttpContext.TraceIdentifier));
    }

    /// <summary>
    /// Gets a specific interview by identifier.
    /// </summary>
    /// <param name="id">Interview identifier.</param>
    /// <returns>Interview summary details.</returns>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiEnvelope<InterviewSummaryDto>), StatusCodes.Status200OK)]
    public ActionResult<ApiEnvelope<InterviewSummaryDto>> GetById(Guid id)
    {
        var item = new InterviewSummaryDto(id, Guid.NewGuid(), "Senior Engineer", DateTime.UtcNow.AddDays(1), "scheduled", null);
        return Ok(new ApiEnvelope<InterviewSummaryDto>(item, HttpContext.TraceIdentifier));
    }

    /// <summary>
    /// Reschedules an existing interview.
    /// </summary>
    /// <param name="id">Interview identifier.</param>
    /// <param name="request">Reschedule payload.</param>
    /// <returns>Updated interview summary.</returns>
    [HttpPost("{id:guid}/reschedule")]
    [ProducesResponseType(typeof(ApiEnvelope<InterviewSummaryDto>), StatusCodes.Status200OK)]
    public ActionResult<ApiEnvelope<InterviewSummaryDto>> Reschedule(Guid id, [FromBody] RescheduleInterviewRequest request)
    {
        var item = new InterviewSummaryDto(id, Guid.NewGuid(), "Senior Engineer", request.ScheduledAtUtc, "rescheduled", null);
        return Ok(new ApiEnvelope<InterviewSummaryDto>(item, HttpContext.TraceIdentifier));
    }

    /// <summary>
    /// Returns detailed interview scoring card.
    /// </summary>
    /// <param name="id">Interview identifier.</param>
    /// <returns>Scorecard with weighted dimensions.</returns>
    [HttpGet("{id:guid}/scorecard")]
    [ProducesResponseType(typeof(ApiEnvelope<InterviewScorecardDto>), StatusCodes.Status200OK)]
    public ActionResult<ApiEnvelope<InterviewScorecardDto>> Scorecard(Guid id)
    {
        var dto = new InterviewScorecardDto(id, 8.2m, 7.8m, 8.0m, 8.0m);
        return Ok(new ApiEnvelope<InterviewScorecardDto>(dto, HttpContext.TraceIdentifier));
    }

    /// <summary>
    /// Returns transcript artifact reference for an interview.
    /// </summary>
    /// <param name="id">Interview identifier.</param>
    /// <returns>Transcript download information.</returns>
    [HttpGet("{id:guid}/transcript")]
    [ProducesResponseType(typeof(ApiEnvelope<InterviewTranscriptDto>), StatusCodes.Status200OK)]
    public ActionResult<ApiEnvelope<InterviewTranscriptDto>> Transcript(Guid id)
    {
        var dto = new InterviewTranscriptDto(id, $"https://storage.gethuminex.com/transcripts/{id}.txt");
        return Ok(new ApiEnvelope<InterviewTranscriptDto>(dto, HttpContext.TraceIdentifier));
    }

    /// <summary>
    /// Returns recording artifact metadata for an interview.
    /// </summary>
    /// <param name="id">Interview identifier.</param>
    /// <returns>Recording URL and retention expiry.</returns>
    [HttpGet("{id:guid}/recording")]
    [ProducesResponseType(typeof(ApiEnvelope<InterviewRecordingDto>), StatusCodes.Status200OK)]
    public ActionResult<ApiEnvelope<InterviewRecordingDto>> Recording(Guid id)
    {
        var dto = new InterviewRecordingDto(id, $"https://storage.gethuminex.com/recordings/{id}.mp4", DateTime.UtcNow.AddDays(30));
        return Ok(new ApiEnvelope<InterviewRecordingDto>(dto, HttpContext.TraceIdentifier));
    }

    /// <summary>
    /// Exports interview result artifacts for HR and hiring manager workflows.
    /// </summary>
    /// <param name="id">Interview identifier.</param>
    /// <returns>Export artifact URL.</returns>
    [HttpPost("{id:guid}/export")]
    [ProducesResponseType(typeof(ApiEnvelope<InterviewExportResponse>), StatusCodes.Status200OK)]
    public ActionResult<ApiEnvelope<InterviewExportResponse>> Export(Guid id)
    {
        var dto = new InterviewExportResponse(id, $"https://storage.gethuminex.com/exports/{id}.zip");
        return Ok(new ApiEnvelope<InterviewExportResponse>(dto, HttpContext.TraceIdentifier));
    }
}
