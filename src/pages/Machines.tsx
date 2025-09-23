import AddMachine from './AddMachine';

const Machines = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Machines</h1>
        <p className="text-muted-foreground">Create a new machine</p>
      </div>
      <AddMachine />
    </div>
  );
};

export default Machines;


