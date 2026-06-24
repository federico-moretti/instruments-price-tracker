export function hasPriceOrAvailabilityChange(previous, current) {
  if (typeof previous === 'undefined') {
    return true;
  }

  if (previous.price !== current.price) {
    return true;
  }

  if (previous.availability !== current.availability) {
    return true;
  }

  if (previous.availabilityLabel !== current.availabilityLabel) {
    return true;
  }

  return false;
}
