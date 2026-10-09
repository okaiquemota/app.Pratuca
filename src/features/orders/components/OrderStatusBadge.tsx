import { Badge } from '@/components/ui/Feedback'
import type { OrderStatus } from '@/types/database'
import { STATUS_LABEL, STATUS_TONE } from '../status'

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
}
