type AppointmentLike = {
  scheduledAt: Date | string
  duration: number
}

function setTimeOnDate(targetDate: Date, time: string) {
  const [hour, minute] = time.split(':').map(Number)
  const next = new Date(Date.UTC(
    targetDate.getUTCFullYear(),
    targetDate.getUTCMonth(),
    targetDate.getUTCDate(),
    hour,
    minute,
    0,
    0
  ))
  return next
}

export function getDayBounds(targetDate: Date) {
  const startOfDay = new Date(Date.UTC(
    targetDate.getUTCFullYear(),
    targetDate.getUTCMonth(),
    targetDate.getUTCDate(),
    0,
    0,
    0,
    0
  ))

  const endOfDay = new Date(Date.UTC(
    targetDate.getUTCFullYear(),
    targetDate.getUTCMonth(),
    targetDate.getUTCDate(),
    23,
    59,
    59,
    999
  ))

  return { startOfDay, endOfDay }
}

export function hasAppointmentConflict(
  requestedStart: Date,
  durationMinutes: number,
  existingAppointments: AppointmentLike[]
) {
  const requestedEnd = new Date(requestedStart.getTime() + durationMinutes * 60000)

  return existingAppointments.some((appointment) => {
    const appointmentStart = new Date(appointment.scheduledAt)
    const appointmentEnd = new Date(appointmentStart.getTime() + appointment.duration * 60000)
    return requestedStart < appointmentEnd && requestedEnd > appointmentStart
  })
}

export function generateAvailableTimeSlots(params: {
  targetDate: Date
  startTime: string
  endTime: string
  duration: number
  existingAppointments: AppointmentLike[]
}) {
  const slots: Array<{ start: string; end: string; available: true }> = []
  const windowStart = setTimeOnDate(params.targetDate, params.startTime)
  const windowEnd = setTimeOnDate(params.targetDate, params.endTime)
  const current = new Date(windowStart)

  while (current.getTime() < windowEnd.getTime()) {
    const slotEnd = new Date(current.getTime() + params.duration * 60000)
    if (
      slotEnd.getTime() <= windowEnd.getTime() &&
      !hasAppointmentConflict(current, params.duration, params.existingAppointments)
    ) {
      slots.push({
        start: current.toISOString(),
        end: slotEnd.toISOString(),
        available: true
      })
    }
    current.setMinutes(current.getMinutes() + 30)
  }

  return slots
}
