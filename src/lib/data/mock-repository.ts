// Mock adapter — the behaviour the app ships with today.
//
// Mutations are no-ops that echo the current payload back: the client
// already applied them optimistically, and the demo has no server to
// disagree. That is exactly the contract the HTTP adapter honours with a
// real write behind it, which is why swapping them changes nothing above.

import type { RestaurantOverview } from "@/lib/types/restaurant";
import { getRestaurantOverview } from "@/lib/mock/restaurant";
import type {
  ReservationRefInput,
  RestaurantRepository,
  ReviewReplyInput,
  SeatReservationInput,
  TableRefInput,
} from "./repository";

export class MockRestaurantRepository implements RestaurantRepository {
  async getOverview(): Promise<RestaurantOverview> {
    return getRestaurantOverview();
  }

  async seatReservation(_input: SeatReservationInput) {
    return getRestaurantOverview();
  }

  async confirmReservation(_input: ReservationRefInput) {
    return getRestaurantOverview();
  }

  async cancelReservation(_input: ReservationRefInput) {
    return getRestaurantOverview();
  }

  async clearTable(_input: TableRefInput) {
    return getRestaurantOverview();
  }

  async sendReminder(_input: ReservationRefInput) {
    // No SMS gateway in the demo.
  }

  async replyToReview(_input: ReviewReplyInput) {
    // No review platform in the demo.
  }
}
