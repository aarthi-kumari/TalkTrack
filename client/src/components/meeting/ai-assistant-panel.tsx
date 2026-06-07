"use client";

import { useState } from "react";
import { Send, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import {
	mockAiMessages,
	mockAiSuggestions,
	MockAiMessage,
} from "@/lib/mock/ai-chat";
import { cn } from "@/lib/utils";

function AssistantContent({
	messages,
	input,
	setInput,
	handleSend,
}: {
	messages: MockAiMessage[];
	input: string;
	setInput: (s: string) => void;
	handleSend: () => void;
}) {
	return (
		<div className="flex h-full flex-col">
			<div className="flex items-center justify-between border-b border-border/60 px-4 py-4">
				<div className="flex items-center gap-3">
					<div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
						<Sparkles className="size-4 text-white" />
					</div>
					<div>
						<h2 className="font-semibold">AI Assistant</h2>
						<p className="text-xs text-muted-foreground">Meeting-aware prompts and actions</p>
					</div>
				</div>
				<Switch defaultChecked aria-label="AI assistant enabled" />
			</div>

			<div className="flex min-h-0 flex-1 flex-col gap-4 p-4 overflow-hidden">
				<Button variant="outline" className="h-auto justify-start rounded-2xl border-dashed px-4 py-3 text-left font-medium text-primary">
					<Sparkles className="mr-2 size-4" />
					@AI summarize this meeting
				</Button>

				<Card className="border-border/60 bg-muted/25">
					<CardContent className="space-y-2 px-4 py-4 text-sm leading-relaxed text-foreground/85">
						<p className="font-medium text-foreground">Here is a summary of the meeting:</p>
						<ul className="list-disc space-y-1 pl-5 text-muted-foreground">
							<li>Discussed Q2 product roadmap</li>
							<li>New authentication flow approved</li>
							<li>AI integration is on track</li>
							<li>Next sprint planning on Monday</li>
							<li>Budget approved for AI tools</li>
						</ul>
						<p className="text-xs text-muted-foreground">10:25 AM</p>
					</CardContent>
				</Card>

				<div className="space-y-2">
					<p className="text-sm font-medium text-muted-foreground">Suggested Actions</p>
					<div className="grid gap-2">
						{mockAiSuggestions.map((label) => (
							<Card
								key={label}
								className="cursor-pointer border-border/60 transition-colors hover:bg-accent/10"
							>
								<CardContent className="flex items-center gap-3 px-4 py-3">
									<Badge variant="secondary" className="rounded-full px-2">
										{label === "Create Action Items" ? "1" : label === "Generate Summary" ? "2" : "3"}
									</Badge>
									<div>
										<p className="text-sm font-medium">{label}</p>
										<p className="text-xs text-muted-foreground">
											{label === "Create Action Items"
												? "Extract action items from this meeting"
												: label === "Generate Summary"
													? "Generate a detailed summary"
													: "Create a follow-up meeting"}
										</p>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</div>

				<Button variant="outline" className="h-auto justify-start rounded-2xl border-dashed px-4 py-3 text-left font-medium text-primary">
					<Sparkles className="mr-2 size-4" />
					@AI what are the action items?
				</Button>

				<ScrollArea className="min-h-0 flex-1 pr-2">
					<div className="flex flex-col gap-3 pb-2">
						{messages.map((msg) => (
							<div
								key={msg.id}
								className={cn(
									"max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
									msg.role === "user"
										? "ml-auto bg-primary/10 text-foreground"
										: "border border-border/60 bg-muted/35 text-foreground/85",
								)}
							>
								<p className="whitespace-pre-wrap">{msg.content}</p>
								{msg.time ? (
									<p className="mt-2 text-xs text-muted-foreground">{msg.time}</p>
								) : null}
							</div>
						))}
					</div>
				</ScrollArea>

				<div className="border-t border-border/60 pt-4">
					<InputGroup>
						<InputGroupInput
							placeholder="Ask AI anything…"
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleSend()}
						/>
						<InputGroupAddon align="inline-end">
							<InputGroupButton size="icon-sm" onClick={handleSend}>
								<Send />
							</InputGroupButton>
						</InputGroupAddon>
					</InputGroup>
				</div>
			</div>
		</div>
	);
}

export function AIAssistantPanel() {
	const [messages, setMessages] = useState(mockAiMessages);
	const [input, setInput] = useState("");
	const isMobile = useIsMobile();

	function handleSend() {
		const trimmed = input.trim();
		if (!trimmed) return;
		setMessages((prev) => [
			...prev,
			{ id: String(prev.length), role: "user", content: trimmed },
		]);
		setInput("");
	}

    

	if (isMobile) {
		return (
			<>
				<Sheet>
					<SheetTrigger asChild>
						<button className="fixed bottom-6 right-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg">
							<Sparkles />
						</button>
					</SheetTrigger>
					<SheetContent side="bottom" className="rounded-t-3xl p-0">
						<AssistantContent messages={messages} input={input} setInput={setInput} handleSend={handleSend} />
					</SheetContent>
				</Sheet>
			</>
		);
	}

	return (
		<aside className="sticky top-6 self-start flex h-[calc(100vh-3.5rem)] max-h-[calc(100vh-3.5rem)] w-full flex-col overflow-hidden rounded-3xl border border-border/70 bg-card/95 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
			<AssistantContent messages={messages} input={input} setInput={setInput} handleSend={handleSend} />
		</aside>
	);
}
