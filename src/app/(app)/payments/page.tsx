import { Banknote } from 'lucide-react';
import ModulePlaceholder from '@/components/ModulePlaceholder/ModulePlaceholder';

export const metadata = { title: 'Payments · xSender' };

export default function PaymentsPage() {
  return (
    <ModulePlaceholder
      icon={Banknote}
      title="Payments"
      phase="Phase 8"
      summary="Money your customers pay you. When someone picks “Pay Online” mid-conversation, the bot sends a checkout link and marks the order paid on its own once it clears."
      capabilities={[
        'Card and wallet checkout links sent inside the chat',
        'Cash on delivery and pay-at-venue tracked alongside',
        'Orders flip to paid automatically on the provider webhook',
        'Refunds and settlement history',
      ]}
    />
  );
}
