export function formatArchiveDate(date) {
  if (!date) return "待公布";
  return date.replaceAll("-", ".");
}

export function formatArchivePremiere(event) {
  return event.startDate ? formatArchiveDate(event.startDate) : event.releaseWindow || '待公布';
}

export function formatArchiveRange(event) {
  if (event.factReview) return '播出日期口径待核实';
  if (!event.startDate) return formatArchivePremiere(event);
  if (!event.endDate) return `${formatArchiveDate(event.startDate)} 起`;
  return `${formatArchiveDate(event.startDate)} — ${formatArchiveDate(event.endDate)}`;
}
