import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Paperclip, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useIntegra";
import { Section } from "@/components/FormShell";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/integra";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/", "application/vnd", "text/", "application/msword"];

export function Attachments({ formType, formId }: { formType: string; formId: string }) {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: files } = useQuery({
    queryKey: ["attachments", formId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attachments")
        .select("*")
        .eq("form_id", formId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function upload(file: File) {
    if (!user) return;
    if (file.size > MAX_BYTES) {
      toast.error("Files must be 25 MB or smaller.");
      return;
    }
    if (!ALLOWED.some((prefix) => file.type.startsWith(prefix))) {
      toast.error("Only documents, images and PDFs are accepted.");
      return;
    }
    setBusy(true);
    const path = `${formId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error: uploadError } = await supabase.storage
      .from("form-attachments")
      .upload(path, file);
    if (uploadError) {
      toast.error(uploadError.message);
      setBusy(false);
      return;
    }
    const { error } = await supabase.from("attachments").insert({
      form_type: formType,
      form_id: formId,
      file_name: file.name,
      file_path: path,
      file_size: file.size,
      content_type: file.type,
      uploaded_by: user.id,
    });
    if (error) toast.error(error.message);
    else toast.success("Attachment uploaded");
    queryClient.invalidateQueries({ queryKey: ["attachments", formId] });
    setBusy(false);
  }

  async function open(path: string) {
    const { data, error } = await supabase.storage
      .from("form-attachments")
      .createSignedUrl(path, 300);
    if (error || !data) {
      toast.error("Could not open the file.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function remove(id: string, path: string) {
    await supabase.storage.from("form-attachments").remove([path]);
    await supabase.from("attachments").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["attachments", formId] });
  }

  return (
    <Section title="Attachments" description="Quotes, specs, photos and PDFs up to 25 MB each.">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) upload(file);
          event.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip className="size-4" /> {busy ? "Uploading…" : "Add attachment"}
      </Button>

      <ul className="mt-4 divide-y divide-border">
        {(files ?? []).length === 0 ? (
          <li className="py-3 text-sm text-muted-foreground">No attachments yet.</li>
        ) : (
          (files ?? []).map((file) => (
            <li key={file.id} className="flex items-center justify-between gap-3 py-3">
              <button
                type="button"
                className="min-w-0 text-left text-sm text-primary hover:underline"
                onClick={() => open(file.file_path)}
              >
                <span className="block truncate">{file.file_name}</span>
                <span className="block text-xs text-muted-foreground">
                  {formatDate(file.created_at)} ·{" "}
                  {Math.round((Number(file.file_size) || 0) / 1024)} KB
                </span>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(file.id, file.file_path)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))
        )}
      </ul>
    </Section>
  );
}
