// utils/emailTemplates.js
const formatDate = (d) => {
  if (!d) return '-';
  const date = new Date(d);
  // Show only the date, ignore time zone shift
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};
const timeslotToRange = (ts) => {
  if (!ts) return '-';
  if (typeof ts === 'string') return ts;
  const s = ts.startTime ?? ts.start ?? ts.start_time;
  const e = ts.endTime ?? ts.end ?? ts.end_time;
  if (s && e) return `${s} - ${e}`;
  return ts.label || ts._id || '-';
};
export const approvalRequestEmail = ({ facility, booking, approveUrl }) => {
  const subject = `Please approve booking: ${facility.name} on ${formatDate(booking.date)}`;
  const text = `
Approval required

Facility: ${facility.name}
Date: ${formatDate(booking.date)}
Timeslot(s): ${(booking.timeslots || []).map(ts => ts.label || ts).join(', ') || '-'}
Requested by: ${booking.user?.name || booking.user?.email || booking.user || '-'}

To approve: ${approveUrl || 'open admin panel to approve'}
  `.trim();

  const html = `
    <h2>Approval required</h2>
    <p><strong>Facility:</strong> ${facility.name}</p>
    <p><strong>Date:</strong> ${formatDate(booking.date)}</p>

    <p><strong>Timeslot(s):</strong> ${(booking.timeslots || []).map(ts => ts.label || ts).join(', ') || '-'}</p>
    <p><strong>Requested by:</strong> ${booking.user?.name || booking.user?.email || booking.user || '-'}</p>
    <p style="margin-top:12px;">
      <a href="${approveUrl || '#'}" style="padding:8px 12px; border-radius:4px; text-decoration:none; border:1px solid #333; display:inline-block;">
        Approve booking
      </a>
    </p>
  `;

  return { subject, text, html };
};
export const bookingApprovedEmail = ({ facility, booking }) => {
  const subject = `Booking approved: ${facility.name} on ${formatDate(booking.date)}`;

  // generate timeslot string (safe for populated objects or ID strings)
  const timeslotStr = (booking.timeslots || []).map(ts => {
    if (typeof ts === 'string') return ts;
    const s = ts.startTime ?? ts.start ?? ts.start_time;
    const e = ts.endTime ?? ts.end ?? ts.end_time;
    return (s && e) ? `${s} - ${e}` : (ts.label || ts._id || '-');
  }).join(', ') || '-';

  const text = `
Your booking has been approved.

Facility: ${facility.name}
Date: ${formatDate(booking.date)}
Timeslot(s): ${timeslotStr}
Booking ID: ${booking._id}

Thank you.
  `.trim();

  const html = `
    <h2>Booking approved ✅</h2>
    <p>Your booking has been approved.</p>
    <table cellpadding="6">
      <tr><td><strong>Facility</strong></td><td>${facility.name}</td></tr>
      <tr><td><strong>Date</strong></td><td>${formatDate(booking.date)}</td></tr>
      <tr><td><strong>Timeslot(s)</strong></td><td>${timeslotStr}</td></tr>
      <tr><td><strong>Booking ID</strong></td><td>${booking._id}</td></tr>
    </table>
  `;

  return { subject, text, html };
};
 export const bookingRejectedEmail = ({ facility, booking, reason }) => {
  const subject = `Booking rejected: ${facility.name} on ${formatDate(booking.date)}`;

  const timeslotStr = (booking.timeslots || []).map(ts => {
    if (typeof ts === 'string') return ts;
    const s = ts.startTime ?? ts.start ?? ts.start_time;
    const e = ts.endTime ?? ts.end ?? ts.end_time;
    return (s && e) ? `${s} - ${e}` : (ts.label || ts._id || '-');
  }).join(', ') || '-';

  const text = `
Your booking has been rejected.

Facility: ${facility.name}
Date: ${formatDate(booking.date)}
Timeslot(s): ${timeslotStr}
Booking ID: ${booking._id}
Reason: ${reason || 'Not provided'}

If you want to request another date or timeslot, please make a new booking.
  `.trim();

  const html = `
    <h2>Booking rejected ❌</h2>
    <p>Your booking has been rejected.</p>
    <table cellpadding="6">
      <tr><td><strong>Facility</strong></td><td>${facility.name}</td></tr>
      <tr><td><strong>Date</strong></td><td>${formatDate(booking.date)}</td></tr>
      <tr><td><strong>Timeslot(s)</strong></td><td>${timeslotStr}</td></tr>
      <tr><td><strong>Booking ID</strong></td><td>${booking._id}</td></tr>
      <tr><td><strong>Reason</strong></td><td>${reason || '-'}</td></tr>
    </table>
  `;

  return { subject, text, html };
};

