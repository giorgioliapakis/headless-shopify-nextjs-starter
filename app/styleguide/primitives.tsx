"use client";

import { ChevronRightIcon, InboxIcon, SearchIcon, StarIcon } from "lucide-react";
import { useState } from "react";

import { DiscountBadge } from "@/components/product/discount-badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Prose } from "@/components/ui/prose";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Slider,
  SliderContent,
  SliderHeader,
  SliderItem,
  SliderNav,
  SliderTitle,
} from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { Swatch } from "@/components/ui/swatch";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const BUTTON_VARIANTS = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "link",
  "destructive",
] as const;
const BUTTON_SIZES = ["sm", "default", "lg"] as const;

function Specimen({
  children,
  description,
  name,
}: {
  children: React.ReactNode;
  description: string;
  name: string;
}) {
  return (
    <section className="grid gap-stack rounded-xl border bg-card p-6 text-card-foreground">
      <header className="grid gap-1">
        <h3 className="font-mono text-sm font-medium">{name}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>
      <div className="flex flex-wrap items-start gap-stack">{children}</div>
    </section>
  );
}

/**
 * Live specimens for every primitive the starter keeps.
 *
 * The rule this page enforces: if a component survives in `components/ui`, it appears here. An
 * unexercised primitive is a component nobody has looked at in either colour scheme.
 */
export function PrimitiveGallery() {
  const [switchOn, setSwitchOn] = useState(true);
  const [collapsibleOpen, setCollapsibleOpen] = useState(false);

  return (
    <TooltipProvider>
      <div className="grid gap-stack">
        <Specimen
          name="Button"
          description="Every variant, then size, state and render-prop usage."
        >
          <div className="grid gap-inline">
            <div className="flex flex-wrap gap-inline">
              {BUTTON_VARIANTS.map((variant) => (
                <Button key={variant} variant={variant}>
                  {variant}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-inline">
              {BUTTON_SIZES.map((size) => (
                <Button key={size} size={size} variant="outline">
                  size {size}
                </Button>
              ))}
              <Button size="icon" variant="outline" aria-label="Search">
                <SearchIcon />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-inline">
              <Button disabled>disabled</Button>
              <Button aria-invalid variant="outline">
                aria-invalid
              </Button>
              <Button autoFocus={false} className="focus-visible:ring-3" variant="secondary">
                focus me with Tab
              </Button>
              <Button render={<a href="#colors" />} variant="link">
                rendered as an anchor
              </Button>
            </div>
          </div>
        </Specimen>

        <Specimen name="ButtonGroup" description="Segmented actions sharing one border.">
          <ButtonGroup>
            <Button variant="outline">Grid</Button>
            <ButtonGroupSeparator />
            <Button variant="outline">List</Button>
          </ButtonGroup>
        </Specimen>

        <Specimen
          name="Badge / DiscountBadge"
          description="Status pills, including commerce discounts."
        >
          <Badge>default</Badge>
          <Badge variant="secondary">secondary</Badge>
          <Badge variant="outline">outline</Badge>
          <Badge variant="destructive">destructive</Badge>
          <DiscountBadge percent={20} />
          <DiscountBadge percent={35} variant="info" />
        </Specimen>

        <Specimen
          name="EmptyState"
          description="Zero-result and empty surfaces: optional icon, title, copy and action."
        >
          <EmptyState
            className="w-full py-10"
            icon={InboxIcon}
            title="Nothing here yet"
            description="Supporting copy stays muted while the title carries the foreground colour."
            action={<Button variant="outline">Browse products</Button>}
          />
        </Specimen>

        <Specimen name="Card" description="The default surface for grouped content.">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Order 1042</CardTitle>
              <CardDescription>Placed 3 days ago</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Cards inherit the card / card-foreground pair, which is validated separately from
                the page background.
              </p>
            </CardContent>
            <CardFooter>
              <Button size="sm" variant="outline">
                View order
              </Button>
            </CardFooter>
          </Card>
        </Specimen>

        <Specimen
          name="Input / Textarea / Label"
          description="Form fields in default, focus, disabled and error states."
        >
          <div className="grid w-full max-w-sm gap-stack">
            <div className="grid gap-1.5">
              <Label htmlFor="sg-email">Email address</Label>
              <Input id="sg-email" placeholder="you@example.com" type="email" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sg-disabled">Disabled</Label>
              <Input disabled id="sg-disabled" placeholder="Unavailable" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sg-error">Error</Label>
              <Input
                aria-describedby="sg-error-message"
                aria-invalid
                defaultValue="not-an-email"
                id="sg-error"
              />
              <p className="text-sm text-destructive" id="sg-error-message">
                Enter a valid email address.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sg-note">Note</Label>
              <Textarea id="sg-note" placeholder="Gift message" rows={3} />
            </div>
          </div>
        </Specimen>

        <Specimen name="InputGroup" description="An input with leading or trailing affordances.">
          <InputGroup className="w-full max-w-sm">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput placeholder="Search products" />
          </InputGroup>
        </Specimen>

        <Specimen name="Select / NativeSelect" description="Styled listbox and the no-JS fallback.">
          <Select>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="price-asc">Price, low to high</SelectItem>
              <SelectItem value="price-desc">Price, high to low</SelectItem>
            </SelectContent>
          </Select>
          <NativeSelect aria-label="Market" className="w-48" defaultValue="gb">
            <NativeSelectOption value="gb">United Kingdom</NativeSelectOption>
            <NativeSelectOption value="de">Germany</NativeSelectOption>
          </NativeSelect>
        </Specimen>

        <Specimen name="Switch" description="Boolean control with a labelled target.">
          <div className="flex items-center gap-inline">
            <Switch checked={switchOn} id="sg-switch" onCheckedChange={setSwitchOn} />
            <Label htmlFor="sg-switch">Email me about restocks</Label>
          </div>
          <div className="flex items-center gap-inline">
            <Switch disabled id="sg-switch-disabled" />
            <Label htmlFor="sg-switch-disabled">Disabled</Label>
          </div>
        </Specimen>

        <Specimen name="Swatch" description="Colour and image option selector for variants.">
          <Swatch color="#0f7a41" label="Forest" />
          <Swatch color="#1d4ed8" label="Cobalt" selected />
          <Swatch color="#c8c8c8" label="Ash" />
        </Specimen>

        <Specimen name="Accordion / Collapsible" description="Disclosure primitives.">
          <Accordion className="w-full max-w-sm">
            <AccordionItem value="delivery">
              <AccordionTrigger>Delivery</AccordionTrigger>
              <AccordionContent>Two to four working days.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="returns">
              <AccordionTrigger>Returns</AccordionTrigger>
              <AccordionContent>Thirty days, free within the UK.</AccordionContent>
            </AccordionItem>
          </Accordion>
          <Collapsible onOpenChange={setCollapsibleOpen} open={collapsibleOpen}>
            <CollapsibleTrigger
              render={
                <Button variant="outline">
                  <ChevronRightIcon className={collapsibleOpen ? "rotate-90" : undefined} />
                  Size guide
                </Button>
              }
            />
            <CollapsibleContent className="pt-3 text-sm text-muted-foreground">
              Measurements are taken flat, in centimetres.
            </CollapsibleContent>
          </Collapsible>
        </Specimen>

        <Specimen
          name="Popover / DropdownMenu / HoverCard / Tooltip"
          description="Layered surfaces. All four use the popover token pair."
        >
          <Popover>
            <PopoverTrigger render={<Button variant="outline">Popover</Button>} />
            <PopoverContent className="text-sm">
              Anchored panel for secondary content.
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline">Dropdown</Button>} />
            <DropdownMenuContent>
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Orders</DropdownMenuItem>
              <DropdownMenuItem>Addresses</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <HoverCard>
            <HoverCardTrigger render={<Button variant="outline">Hover card</Button>} />
            <HoverCardContent className="text-sm">
              Pointer-only preview. Never the sole route to information.
            </HoverCardContent>
          </HoverCard>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button aria-label="Favourite" variant="outline">
                  <StarIcon />
                </Button>
              }
            />
            <TooltipContent>Add to favourites</TooltipContent>
          </Tooltip>
        </Specimen>

        <Specimen name="Dialog / Sheet" description="Modal surfaces over the overlay token scrim.">
          <Dialog>
            <DialogTrigger render={<Button variant="outline">Open dialog</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Size guide</DialogTitle>
                <DialogDescription>
                  The scrim is drawn from the overlay token, not a literal black.
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
          <Sheet>
            <SheetTrigger render={<Button variant="outline">Open sheet</Button>} />
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>Side panel used by collection filtering.</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
        </Specimen>

        <Specimen name="Breadcrumb" description="Ancestry trail with the current page marked.">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<a href="#colors" />}>Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink render={<a href="#colors" />}>Collections</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Outerwear</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </Specimen>

        <Specimen name="Slider" description="Horizontal scroll rail used by product carousels.">
          <Slider className="w-full">
            <SliderHeader>
              <SliderTitle>Recently viewed</SliderTitle>
              <SliderNav />
            </SliderHeader>
            <SliderContent>
              {["One", "Two", "Three", "Four", "Five"].map((label) => (
                <SliderItem key={label} className="w-40 shrink-0">
                  <ImagePlaceholder className="aspect-square rounded-lg" />
                  <p className="pt-2 text-sm">{label}</p>
                </SliderItem>
              ))}
            </SliderContent>
          </Slider>
        </Specimen>

        <Specimen
          name="Skeleton / Spinner / Separator / ImagePlaceholder"
          description="Pending and empty states."
        >
          <div className="grid w-full max-w-sm gap-inline">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Spinner />
          <Separator className="w-40" />
          <ImagePlaceholder className="size-24 rounded-lg" />
        </Specimen>

        <Specimen name="Prose" description="Long-form Shopify HTML, typographically constrained.">
          <Prose>
            <h2>Care instructions</h2>
            <p>
              Prose applies the typography plugin with heading weights and tracking aligned to the
              rest of the scale.
            </p>
            <ul>
              <li>Wash cold, inside out</li>
              <li>Dry flat, away from direct heat</li>
            </ul>
          </Prose>
        </Specimen>
      </div>
    </TooltipProvider>
  );
}
