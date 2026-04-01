export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      service_requests: {
        Row: {
          id: string;
          request_no: string;
          request_type: "METER" | "EXTENSION";
          current_status: string;
          current_owner_id: string;
          area_code: string;
          customer_name: string;
          customer_phone: string;
          supply_address: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
  };
};
