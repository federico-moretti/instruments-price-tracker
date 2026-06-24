import { notifyCheckSummary } from '../lib/notify.js';

await notifyCheckSummary({
  wishlistName: 'Guitars',
  results: [
    {
      type: 'success',
      title: 'Harley Benton Fusion IV',
      url: 'https://www.thomann.it/harley_benton_fusion_iv_hss_mn_qbkb.htm',
      price: 479,
      currency: 'EUR',
      availability: 'in-stock',
      availabilityLabel: 'Disponibile',
      previousPrice: 499,
      previousAvailability: 'on-date',
      previousAvailabilityLabel: 'Disponibile fra circa una settimana',
    },
    {
      type: 'success',
      title: 'Yamaha Revstar RSS02T',
      url: 'https://www.thomann.it/yamaha_revstar_rss02t_fired_red.htm',
      price: 819,
      currency: 'EUR',
      availability: 'on-date',
      availabilityLabel: 'Disponibile fra circa una settimana',
    },
  ],
});

console.log('Notification sent');
