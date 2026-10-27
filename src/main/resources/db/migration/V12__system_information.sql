CREATE TABLE public.system_information (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    version BIGINT NOT NULL DEFAULT 0 CHECK (version >= 0),
    blocks JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(blocks) = 'array'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO public.system_information(id) VALUES (1);
