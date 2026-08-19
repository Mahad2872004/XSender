/**
 * Database types for schema v1.
 *
 * Hand-maintained for now. Once the Supabase CLI is linked to the project,
 * regenerate instead of editing:
 *
 *   npm run db:types
 *
 * Keep this in sync with supabase/migrations/*.sql.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type WorkspaceRole = 'owner' | 'admin' | 'agent' | 'viewer';
/**
 * Free text, not an enum: the canonical list lives in src/lib/verticals.ts so
 * adding an industry is shipping a template rather than writing a migration.
 */
export type BusinessVertical = string;
export type ChannelType = 'whatsapp' | 'instagram' | 'messenger' | 'simulator';
export type ChannelStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type ConversationStatus = 'open' | 'pending' | 'resolved';
export type MessageDirection = 'inbound' | 'outbound';
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
export type MessageAuthor = 'customer' | 'flow' | 'agent' | 'campaign' | 'system';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'dead';

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  vertical: BusinessVertical;
  timezone: string;
  currency: string;
  /** BCP 47, e.g. en-GB. Drives date parsing, formatting and the bot's phrases. */
  locale: string;
  /** ISO 3166-1 alpha-2. Null until known. Drives regional pricing. */
  country_code: string | null;
  settings: Json;
  onboarded_at: string | null;
  /** Backs next_order_code()/next_booking_code(); never set directly. */
  order_counter: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type WorkspaceMember = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
  updated_at: string;
}

export type Channel = {
  id: string;
  workspace_id: string;
  type: ChannelType;
  status: ChannelStatus;
  display_name: string;
  waba_id: string | null;
  phone_number_id: string | null;
  phone_number: string | null;
  ig_user_id: string | null;
  page_id: string | null;
  business_id: string | null;
  access_token_ciphertext: string | null;
  token_expires_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
  connected_at: string | null;
  created_at: string;
  updated_at: string;
}

export type Contact = {
  id: string;
  workspace_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  attributes: Json;
  tags: string[];
  notes: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ContactIdentity = {
  id: string;
  workspace_id: string;
  contact_id: string;
  channel_type: ChannelType;
  external_id: string;
  display_name: string | null;
  created_at: string;
}

export type Conversation = {
  id: string;
  workspace_id: string;
  contact_id: string;
  channel_id: string;
  status: ConversationStatus;
  needs_human: boolean;
  assigned_to: string | null;
  window_expires_at: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export type Message = {
  id: string;
  workspace_id: string;
  conversation_id: string;
  direction: MessageDirection;
  author: MessageAuthor;
  author_user_id: string | null;
  payload: Json;
  status: MessageStatus;
  external_id: string | null;
  error: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
}

export type Job = {
  id: number;
  workspace_id: string | null;
  type: string;
  payload: Json;
  status: JobStatus;
  run_at: string;
  attempts: number;
  max_attempts: number;
  locked_at: string | null;
  locked_by: string | null;
  last_error: string | null;
  dedupe_key: string | null;
  created_at: string;
  completed_at: string | null;
}

export type EventRow = {
  id: number;
  workspace_id: string;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  actor_user_id: string | null;
  payload: Json;
  created_at: string;
}

export type FlowStatus = 'draft' | 'published' | 'archived';

export type FlowRunStatus =
  | 'running'
  | 'awaiting_input'
  | 'sleeping'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type Flow = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  vertical: BusinessVertical | null;
  status: FlowStatus;
  trigger: Json;
  priority: number;
  published_version_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type FlowVersion = {
  id: string;
  workspace_id: string;
  flow_id: string;
  version: number;
  graph: Json;
  entry_node_id: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type FlowRun = {
  id: string;
  workspace_id: string;
  conversation_id: string;
  flow_id: string;
  flow_version_id: string;
  status: FlowRunStatus;
  current_node_id: string | null;
  awaiting: Json;
  variables: Json;
  resume_at: string | null;
  steps_taken: number;
  error: string | null;
  started_at: string;
  ended_at: string | null;
  updated_at: string;
};

export type FlowRunStep = {
  id: number;
  workspace_id: string;
  flow_run_id: string;
  node_id: string;
  node_type: string;
  outcome: string;
  detail: Json;
  duration_ms: number | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Commerce
// ---------------------------------------------------------------------------

export type CatalogItemType = 'menu_item' | 'product' | 'service';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type FulfillmentType = 'delivery' | 'pickup' | 'dine_in';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'refunded' | 'failed';
export type PaymentMethod = 'cash' | 'card' | 'wallet' | 'bank_transfer' | 'online';
export type ResourceType = 'table' | 'staff' | 'room' | 'property' | 'other';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export type CatalogCategory = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type CatalogItem = {
  id: string;
  workspace_id: string;
  category_id: string | null;
  type: CatalogItemType;
  name: string;
  description: string | null;
  /** Minor units — 750 rupees is 75000. */
  price_minor: number;
  currency: string;
  photo_url: string | null;
  available: boolean;
  sort_order: number;
  sku: string | null;
  duration_minutes: number | null;
  options: Json;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  workspace_id: string;
  contact_id: string;
  conversation_id: string | null;
  code: string;
  status: OrderStatus;
  fulfillment: FulfillmentType;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  scheduled_for: string | null;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  payment_reference: string | null;
  subtotal_minor: number;
  delivery_fee_minor: number;
  total_minor: number;
  currency: string;
  notes: string | null;
  placed_by: string;
  rating: number | null;
  rated_at: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type OrderItem = {
  id: string;
  workspace_id: string;
  order_id: string;
  catalog_item_id: string | null;
  name: string;
  unit_price_minor: number;
  quantity: number;
  line_total_minor: number;
  selected_options: Json;
  created_at: string;
};

export type Resource = {
  id: string;
  workspace_id: string;
  type: ResourceType;
  name: string;
  description: string | null;
  capacity: number;
  active: boolean;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export type AvailabilityRule = {
  id: string;
  workspace_id: string;
  resource_id: string;
  /** 0 = Sunday, matching PostgreSQL's extract(dow). */
  weekday: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  created_at: string;
};

export type AvailabilityException = {
  id: string;
  workspace_id: string;
  resource_id: string;
  on_date: string;
  closed: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  created_at: string;
};

export type Booking = {
  id: string;
  workspace_id: string;
  contact_id: string;
  conversation_id: string | null;
  resource_id: string | null;
  catalog_item_id: string | null;
  code: string;
  status: BookingStatus;
  starts_at: string;
  ends_at: string;
  party_size: number | null;
  notes: string | null;
  reminder_sent_at: string | null;
  placed_by: string;
  created_at: string;
  updated_at: string;
};

/** An anonymous visitor's throwaway conversation on the public demo. */
export type DemoSession = {
  id: string;
  token: string;
  workspace_id: string;
  contact_id: string;
  conversation_id: string;
  ip_hash: string | null;
  message_count: number;
  created_at: string;
  last_message_at: string;
};

export type WebhookDelivery = {
  id: number;
  source: string;
  workspace_id: string | null;
  signature_ok: boolean;
  headers: Json;
  body: Json;
  processed_at: string | null;
  error: string | null;
  created_at: string;
}

/** Columns the database always supplies. */
type Generated = 'id' | 'created_at' | 'updated_at';

type NullableKeys<Row> = {
  [K in keyof Row]-?: null extends Row[K] ? K : never;
}[keyof Row];

/**
 * A column may be omitted on insert when it is generated, nullable, or has a
 * database default. The first two are inferable; defaults are not, so each
 * table names its defaulted columns in the `Defaulted` parameter.
 */
type TableOf<Row, Defaulted extends keyof Row = never> = {
  Row: Row;
  Insert: Omit<Row, OptionalOnInsert<Row, Defaulted>> &
    Partial<Pick<Row, OptionalOnInsert<Row, Defaulted>>>;
  Update: Partial<Row>;
  Relationships: [];
};

type OptionalOnInsert<Row, Defaulted extends keyof Row> = ((Generated &
  keyof Row) |
  NullableKeys<Row> |
  Defaulted) &
  keyof Row;

export type Database = {
  public: {
    Tables: {
      profiles: TableOf<Profile>;
      workspaces: TableOf<
        Workspace,
        | 'vertical'
        | 'timezone'
        | 'currency'
        | 'locale'
        | 'settings'
        | 'order_counter'
      >;
      workspace_members: TableOf<WorkspaceMember, 'role'>;
      channels: TableOf<Channel, 'status'>;
      contacts: TableOf<Contact, 'attributes' | 'tags'>;
      contact_identities: TableOf<ContactIdentity>;
      conversations: TableOf<
        Conversation,
        'status' | 'needs_human' | 'unread_count'
      >;
      messages: TableOf<Message, 'status'>;
      jobs: TableOf<
        Job,
        'payload' | 'status' | 'run_at' | 'attempts' | 'max_attempts'
      >;
      events: TableOf<EventRow, 'payload'>;
      webhook_deliveries: TableOf<WebhookDelivery, 'headers'>;
      flows: TableOf<Flow, 'status' | 'trigger' | 'priority'>;
      flow_versions: TableOf<FlowVersion>;
      flow_runs: TableOf<
        FlowRun,
        'status' | 'variables' | 'steps_taken' | 'started_at'
      >;
      flow_run_steps: TableOf<FlowRunStep, 'detail'>;
      catalog_categories: TableOf<CatalogCategory, 'sort_order' | 'active'>;
      catalog_items: TableOf<
        CatalogItem,
        'type' | 'price_minor' | 'currency' | 'available' | 'sort_order' | 'options'
      >;
      orders: TableOf<
        Order,
        | 'status'
        | 'fulfillment'
        | 'payment_status'
        | 'subtotal_minor'
        | 'delivery_fee_minor'
        | 'total_minor'
        | 'currency'
        | 'placed_by'
      >;
      order_items: TableOf<OrderItem, 'quantity' | 'selected_options'>;
      resources: TableOf<Resource, 'type' | 'capacity' | 'active' | 'metadata'>;
      availability_rules: TableOf<AvailabilityRule, 'slot_minutes'>;
      availability_exceptions: TableOf<AvailabilityException, 'closed'>;
      bookings: TableOf<Booking, 'status' | 'placed_by'>;
      demo_sessions: TableOf<DemoSession, 'message_count' | 'last_message_at'>;
    };
    Views: Record<never, never>;
    Functions: {
      create_workspace: {
        Args: {
          p_user_id: string;
          p_name: string;
          p_vertical?: string;
          p_timezone?: string;
          p_currency?: string;
          p_locale?: string;
          p_country?: string | null;
        };
        Returns: Workspace;
      };
      claim_jobs: {
        Args: { worker_id: string; batch_size?: number };
        Returns: Job[];
      };
      reap_demo_sessions: { Args: { older_than?: string }; Returns: number };
      reap_stalled_jobs: {
        Args: { stall_after?: string };
        Returns: number;
      };
      next_order_code: { Args: { ws: string }; Returns: string };
      next_booking_code: { Args: { ws: string }; Returns: string };
      is_workspace_member: { Args: { ws: string }; Returns: boolean };
      workspace_role_of: { Args: { ws: string }; Returns: WorkspaceRole };
      can_admin_workspace: { Args: { ws: string }; Returns: boolean };
    };
    Enums: {
      workspace_role: WorkspaceRole;
      channel_type: ChannelType;
      channel_status: ChannelStatus;
      conversation_status: ConversationStatus;
      message_direction: MessageDirection;
      message_status: MessageStatus;
      message_author: MessageAuthor;
      job_status: JobStatus;
      flow_status: FlowStatus;
      flow_run_status: FlowRunStatus;
      catalog_item_type: CatalogItemType;
      order_status: OrderStatus;
      fulfillment_type: FulfillmentType;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
      resource_type: ResourceType;
      booking_status: BookingStatus;
    };
    CompositeTypes: Record<never, never>;
  };
}
