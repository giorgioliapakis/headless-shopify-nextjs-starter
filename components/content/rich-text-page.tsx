import { Container } from "@/components/ui/container";
import { Page } from "@/components/ui/page";
import { Prose } from "@/components/ui/prose";
import { sanitizeShopifyHtml } from "@/lib/security/html";

interface RichTextPageProps {
  body: string;
  title: string;
}

export function RichTextPage({ body, title }: RichTextPageProps) {
  return (
    <Page>
      <Container className="max-w-2xl">
        <Prose>
          <h1>{title}</h1>
          <div
            // oxlint-disable-next-line react/no-danger -- reconstructed through the local rich-text allowlist.
            dangerouslySetInnerHTML={{ __html: sanitizeShopifyHtml(body) }}
          />
        </Prose>
      </Container>
    </Page>
  );
}
