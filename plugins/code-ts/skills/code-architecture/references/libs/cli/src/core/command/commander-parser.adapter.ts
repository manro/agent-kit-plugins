import { Command, CommanderError, InvalidArgumentError, Option } from "commander";

import type { Cli } from "#cli/index.ts";

export default class CommanderParser {
  readonly #exitCodes: Cli.ExitCodes;
  readonly #program: Command;
  readonly #openIo: Cli.CommanderParser.OpenIo;

  #activeCommand: Command | null = null;
  #selection: Cli.CommanderParser.Selection | null = null;
  #io: Cli.Io | null = null;

  constructor({
    exitCodes,
    program,
    openIo
  }: {
    exitCodes: Cli.ExitCodes;
    program: Command;
    openIo: Cli.CommanderParser.OpenIo;
  }) {
    this.#exitCodes = exitCodes;
    this.#program = program;
    this.#openIo = openIo;
  }

  // Opened on first use, once Commander has parsed the shared flags; a failed open is not kept.
  get io(): Cli.Io {
    this.#io ??= this.#openIo({ ioFlags: this.#ioFlags, scope: this.#scope });

    return this.#io;
  }

  get #ioFlags(): Cli.ProcessIo.IoFlags {
    const values = (this.#activeCommand ?? this.#program).optsWithGlobals<Cli.Values>();

    const readText = (optionValue: unknown): string | undefined =>
      typeof optionValue === "string" ? optionValue : undefined;

    return {
      modeFlags: { isPlain: values.plain === true, isInteractive: values.interactive === true },
      logFlags: { level: readText(values.logLevel), format: readText(values.logFormat) }
    };
  }

  /** The logger's scope: the program, then the command when the program has several. */
  get #scope(): string {
    const command = this.#activeCommand;

    return command && command !== this.#program
      ? `${this.#program.name()} ${command.name()}`
      : this.#program.name();
  }

  static open({
    exitCodes,
    commandsList,
    name,
    sharedOptionsList,
    summary,
    openIo
  }: Cli.CommanderParser.Options): CommanderParser {
    const program = new Command().name(name).description(summary);
    const parser = new CommanderParser({ exitCodes, program, openIo });

    program
      .exitOverride()
      .allowExcessArguments(false)
      .configureOutput({
        writeOut: text => parser.#writeLines(text, parser.io.output),
        writeErr: text => parser.#writeLines(text, parser.io.errorOutput),
        outputError: text => {
          const { io } = parser;

          io.errorOutput.writeLine(io.style.failure(text.replace(/[\r\n]+/g, " ").trimEnd()));

          parser.writeUsage(io);
        }
      })
      .configureHelp({
        styleTitle: text => parser.io.style.strong(text),
        styleUsage: text => parser.io.style.accent(text),
        styleOptionText: text => parser.io.style.accent(text),
        styleCommandText: text => parser.io.style.accent(text),
        styleSubcommandText: text => parser.io.style.accent(text),
        styleOptionDescription: text => text.replace(/\(default: .*\)$/, parser.io.style.muted)
      });

    for (const command of commandsList) {
      const target =
        commandsList.length === 1
          ? program
          : program.command(command.name).description(command.summary);

      target.allowExcessArguments(false).exitOverride();

      for (const option of [...command.optionsList, ...sharedOptionsList]) {
        parser.#addOption({ target, option });
      }

      target.action(() => {
        parser.#activeCommand = target;
        parser.#selection = { command, values: target.opts<Cli.Values>() };
      });
    }

    if (commandsList.length > 1) {
      for (const sharedOption of sharedOptionsList) {
        const flagOption = new Option(sharedOption.flags, sharedOption.description);

        program.addOption(
          sharedOption.choicesList ? flagOption.choices(sharedOption.choicesList) : flagOption
        );
      }

      program
        .addHelpCommand()
        .allowExcessArguments(true)
        .action(() => {
          if (program.args.length > 0) {
            program.error(`unknown command '${program.args[0]}'`);
          } else {
            program.outputHelp();
          }
        });
    }

    program.hook("preSubcommand", (_parent, child) => {
      parser.#activeCommand = child;
    });

    return parser;
  }

  async parse(argvSource: Cli.CommanderParser.ArgvSource): Promise<Cli.CommanderParser.Outcome> {
    try {
      await this.#program.parseAsync([...argvSource.argv], { from: "node" });

      return this.#selection === null
        ? { status: "done", exitCode: this.#exitCodes.done }
        : { status: "command", ...this.#selection };
    } catch (error) {
      if (error instanceof CommanderError) {
        return {
          status: "done",
          exitCode:
            error.exitCode === this.#exitCodes.done ? this.#exitCodes.done : this.#exitCodes.failed
        };
      }

      throw error;
    }
  }

  writeUsage(io: Cli.Io): void {
    const target = this.#activeCommand ?? this.#program;

    io.errorOutput.writeLine(
      io.style.muted(`Usage: ${target.createHelp().commandUsage(target)} (see --help)`)
    );
  }

  #addOption({ target, option }: { target: Command; option: Cli.Option }): void {
    const flagOption = new Option(option.flags, option.description);
    const { choicesList, parseValue } = option;

    if (choicesList) {
      flagOption.choices(choicesList);
    }

    if (option.defaultValue !== undefined) {
      flagOption.default(option.defaultValue);
    }

    if (option.isRepeatable || parseValue) {
      flagOption.argParser((text: string, previous: unknown) => {
        this.#activeCommand = target;

        // argParser() replaces the parser choices() installed, and with it the choices check.
        if (choicesList && !choicesList.includes(text)) {
          throw new InvalidArgumentError(`Allowed choices are ${choicesList.join(", ")}.`);
        }

        const previousValue =
          target.getOptionValueSource(flagOption.attributeName()) === "default"
            ? undefined
            : previous;

        const parsedValue = parseValue ? parseValue(text, previousValue) : text;

        return option.isRepeatable
          ? [...(Array.isArray(previousValue) ? previousValue : []), parsedValue]
          : parsedValue;
      });
    }

    target.addOption(flagOption);
  }

  #writeLines(text: string, output: Cli.Io["output"]): void {
    for (const line of text.replace(/\n$/, "").split("\n")) {
      output.writeLine(line);
    }
  }
}

declare module "@manro/lib-cli" {
  namespace Cli.CommanderParser {
    type INSTANCE = CommanderParser;

    type Options = {
      exitCodes: Cli.ExitCodes;
      commandsList: readonly Cli.Command[];
      name: string;
      sharedOptionsList: readonly Cli.Option[];
      summary: string;
      openIo: OpenIo;
    };

    type OpenIo = (input: { ioFlags: Cli.ProcessIo.IoFlags; scope: string }) => Cli.Io;

    /**
     * The process, or a stand-in for it: `argv` holds the runtime and script paths, then the
     * arguments, which Commander parses.
     * @external Node's `process` names the property.
     */
    type ArgvSource = Readonly<{ argv: readonly string[] }>;

    type Selection = { command: Cli.Command; values: Cli.Values };
    type Outcome = ({ status: "command" } & Selection) | { status: "done"; exitCode: number };
  }
}
