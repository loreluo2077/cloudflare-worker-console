'use client'
import React, { useState, useEffect } from 'react';
import { Typography, Button, List, ListItem, ListItemText, IconButton, CircularProgress, Paper, TextField } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

interface Command {
  command: string;
  description: string;
}

export default function Home() {
  const [migrationName, setMigrationName] = useState('create_user_table');
  const [workingDirectory, setWorkingDirectory] = useState('');
  const [databaseName, setDatabaseName] = useState('');
  const [commands, setCommands] = useState<Command[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [commandOutput, setCommandOutput] = useState('');
  const [latestMigrationFile, setLatestMigrationFile] = useState('[-]');


  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (databaseName) {
      generateCommands(databaseName);
    }
  }, [migrationName, databaseName,latestMigrationFile]);


  const fetchInitialData = async () => {
    try {
      const response = await fetch('/api/initial-data');
      const data = await response.json();
      setWorkingDirectory(data.workingDirectory);
      setDatabaseName(data.databaseName);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const generateCommands = (dbName: string) => {
    const newCommands: Command[] = [
      {
        command: `npx wrangler d1 migrations create ${dbName} ${migrationName}`,
        description: "Create a new D1 migration file"
      },
      {
        command: `npx prisma migrate diff --from-empty --to-schema-datamodel ./prisma/schema.prisma --script --output migrations/${latestMigrationFile}`,
        description: "First Generate SQL from Prisma schema"
      },
      {
        command: `npx prisma migrate diff --from-local-d1 --to-schema-datamodel ./prisma/schema.prisma --script --output migrations/${latestMigrationFile}`,
        description: "Exist Generate SQL from Prisma schema"
      },
      {
        command: `npx wrangler d1 migrations apply ${dbName} --local`,
        description: "Apply the migration to your local D1 database"
      },
      {
        command: `npx prisma generate`,
        description: "Generate Prisma client"
      }
    ];
    setCommands(newCommands);
  };

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
  };

const runCommand = async (command: string) => {
  setIsRunning(true);
  setCommandOutput('');
  try {
    const response = await fetch('/api/run-command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, workingDirectory })
    });
    const data = await response.json();
    setCommandOutput(data.output);

    // Extract migration file name if the command was to create a migration
    if (command.includes('npx wrangler d1 migrations create')) {
      const match = data.output.match(/Successfully created Migration '(.+\.sql)'/);
      if (match) {
        const newMigrationFile = match[1];
        setLatestMigrationFile(newMigrationFile);
        console.log('New migration file:', newMigrationFile);
        // Update the Prisma command with the new migration file
      } else {
        console.log('No match found in the output:', data.output);
      }
    } else {
      console.log('Command does not include "npx wrangler d1 migrations create":', command);
    }
  } catch (error) {
    console.error('Error running command:', error);
    setCommandOutput('Error running command. Please try again.');
  } finally {
    setIsRunning(false);
  }
};


  return (
    <div>
      <Typography variant="h5" component="h1" gutterBottom sx={{ mb: 2 }}>
        SQL Migration - Cloudflare Serverless Development Workbench
      </Typography>
      <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>
        Working Directory: {workingDirectory}
      </Typography>
      <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>
        Database Name: {databaseName}
      </Typography>
      <TextField
        label="Migration Name"
        value={migrationName}
        onChange={(e) => setMigrationName(e.target.value)}
        fullWidth
        margin="normal"
        helperText="Enter a name for your migration (e.g., create_user_table)"
      />
 <List>
        {commands.map((cmd, index) => (
          <ListItem key={index} 
            secondaryAction={
              <>
                <IconButton edge="end" aria-label="copy" onClick={() => copyCommand(cmd.command)} disabled={isRunning}>
                  <ContentCopyIcon />
                </IconButton>
                <IconButton edge="end" aria-label="run" onClick={() => runCommand(cmd.command)} disabled={isRunning}>
                  <PlayArrowIcon />
                </IconButton>
              </>
            }
          >
            <ListItemText 
              primary={cmd.command} 
              secondary={cmd.description}
            />
          </ListItem>
        ))}
      </List>
      {isRunning && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
          <CircularProgress />
        </div>
      )}
      {commandOutput && (
        <Paper elevation={3} sx={{ mt: 2, p: 2, maxHeight: '300px', overflow: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            Command Output:
          </Typography>
          <pre>{commandOutput}</pre>
        </Paper>
      )}
    </div>
  );
}