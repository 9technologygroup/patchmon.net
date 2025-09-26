import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertTriangle,
	BarChart3,
	Download,
	Edit,
	Package,
	Plus,
	RefreshCw,
	Save,
	Server,
	Settings,
	Shield,
	Trash2,
	Users,
	X,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { permissionsAPI } from "../utils/api";

const Permissions = () => {
	const [editingRole, setEditingRole] = useState(null);
	const [showAddModal, setShowAddModal] = useState(false);
	const queryClient = useQueryClient();
	const { refreshPermissions } = useAuth();

	// Fetch all role permissions
	const {
		data: roles,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["rolePermissions"],
		queryFn: () => permissionsAPI.getRoles().then((res) => res.data),
	});

	// Update role permissions mutation
	const updateRoleMutation = useMutation({
		mutationFn: ({ role, permissions }) =>
			permissionsAPI.updateRole(role, permissions),
		onSuccess: () => {
			queryClient.invalidateQueries(["rolePermissions"]);
			setEditingRole(null);
			// Refresh user permissions to apply changes immediately
			refreshPermissions();
		},
	});

	// Delete role mutation
	const deleteRoleMutation = useMutation({
		mutationFn: (role) => permissionsAPI.deleteRole(role),
		onSuccess: () => {
			queryClient.invalidateQueries(["rolePermissions"]);
		},
	});

	const handleSavePermissions = async (role, permissions) => {
		try {
			await updateRoleMutation.mutateAsync({ role, permissions });
		} catch (error) {
			console.error("Failed to update permissions:", error);
		}
	};

	const handleDeleteRole = async (role) => {
		if (
			window.confirm(
				`Are you sure you want to delete the "${role}" role? This action cannot be undone.`,
			)
		) {
			try {
				await deleteRoleMutation.mutateAsync(role);
			} catch (error) {
				console.error("Failed to delete role:", error);
			}
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-danger-50 border border-danger-200 rounded-md p-4">
				<div className="flex">
					<AlertTriangle className="h-5 w-5 text-danger-400" />
					<div className="ml-3">
						<h3 className="text-sm font-medium text-danger-800">
							Error loading permissions
						</h3>
						<p className="mt-1 text-sm text-danger-700">{error.message}</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex justify-end items-center">
				<div className="flex space-x-3">
					<button
						type="button"
						onClick={() => refreshPermissions()}
						className="inline-flex items-center px-4 py-2 border border-secondary-300 text-sm font-medium rounded-md text-secondary-700 bg-white hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
					>
						<RefreshCw className="h-4 w-4 mr-2" />
						Refresh Permissions
					</button>
					<button
						type="button"
						onClick={() => setShowAddModal(true)}
						className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
					>
						<Plus className="h-4 w-4 mr-2" />
						Add Role
					</button>
				</div>
			</div>

			{/* Roles List */}
			<div className="space-y-4">
				{roles &&
					Array.isArray(roles) &&
					roles.map((role) => (
						<RolePermissionsCard
							key={role.id}
							role={role}
							isEditing={editingRole === role.role}
							onEdit={() => setEditingRole(role.role)}
							onCancel={() => setEditingRole(null)}
							onSave={handleSavePermissions}
							onDelete={handleDeleteRole}
						/>
					))}
			</div>

			{/* Add Role Modal */}
			<AddRoleModal
				isOpen={showAddModal}
				onClose={() => setShowAddModal(false)}
				onSuccess={() => {
					queryClient.invalidateQueries(["rolePermissions"]);
					setShowAddModal(false);
				}}
			/>
		</div>
	);
};

// Role Permissions Card Component
const RolePermissionsCard = ({
	role,
	isEditing,
	onEdit,
	onCancel,
	onSave,
	onDelete,
}) => {
	const [permissions, setPermissions] = useState(role);

	// Sync permissions state with role prop when it changes
	useEffect(() => {
		setPermissions(role);
	}, [role]);

	const permissionFields = [
		{
			key: "can_view_dashboard",
			label: "View Dashboard",
			icon: BarChart3,
			description: "Access to the main dashboard",
		},
		{
			key: "can_view_hosts",
			label: "View Hosts",
			icon: Server,
			description: "See host information and status",
		},
		{
			key: "can_manage_hosts",
			label: "Manage Hosts",
			icon: Edit,
			description: "Add, edit, and delete hosts",
		},
		{
			key: "can_view_packages",
			label: "View Packages",
			icon: Package,
			description: "See package information",
		},
		{
			key: "can_manage_packages",
			label: "Manage Packages",
			icon: Settings,
			description: "Edit package details",
		},
		{
			key: "can_view_users",
			label: "View Users",
			icon: Users,
			description: "See user list and details",
		},
		{
			key: "can_manage_users",
			label: "Manage Users",
			icon: Shield,
			description: "Add, edit, and delete users",
		},
		{
			key: "can_view_reports",
			label: "View Reports",
			icon: BarChart3,
			description: "Access to reports and analytics",
		},
		{
			key: "can_export_data",
			label: "Export Data",
			icon: Download,
			description: "Download data and reports",
		},
		{
			key: "can_manage_settings",
			label: "Manage Settings",
			icon: Settings,
			description: "System configuration access",
		},
	];

	const handlePermissionChange = (key, value) => {
		setPermissions((prev) => ({
			...prev,
			[key]: value,
		}));
	};

	const handleSave = () => {
		onSave(role.role, permissions);
	};

	const isBuiltInRole = role.role === "admin" || role.role === "user";

	return (
		<div className="bg-white dark:bg-secondary-800 shadow rounded-lg">
			<div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-600">
				<div className="flex items-center justify-between">
					<div className="flex items-center">
						<Shield className="h-5 w-5 text-primary-600 mr-3" />
						<h3 className="text-lg font-medium text-secondary-900 dark:text-white capitalize">
							{role.role}
						</h3>
						{isBuiltInRole && (
							<span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
								Built-in Role
							</span>
						)}
					</div>
					<div className="flex items-center space-x-2">
						{isEditing ? (
							<>
								<button
									type="button"
									onClick={handleSave}
									className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
								>
									<Save className="h-4 w-4 mr-1" />
									Save
								</button>
								<button
									type="button"
									onClick={onCancel}
									className="inline-flex items-center px-3 py-1 border border-secondary-300 dark:border-secondary-600 text-sm font-medium rounded-md text-secondary-700 dark:text-secondary-200 bg-white dark:bg-secondary-700 hover:bg-secondary-50 dark:hover:bg-secondary-600"
								>
									<X className="h-4 w-4 mr-1" />
									Cancel
								</button>
							</>
						) : (
							<>
								<button
									type="button"
									onClick={onEdit}
									disabled={isBuiltInRole}
									className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<Edit className="h-4 w-4 mr-1" />
									Edit
								</button>
								{!isBuiltInRole && (
									<button
										type="button"
										onClick={() => onDelete(role.role)}
										className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
									>
										<Trash2 className="h-4 w-4 mr-1" />
										Delete
									</button>
								)}
							</>
						)}
					</div>
				</div>
			</div>

			<div className="px-6 py-4">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{permissionFields.map((field) => {
						const Icon = field.icon;
						const isChecked = permissions[field.key];

						return (
							<div key={field.key} className="flex items-start">
								<div className="flex items-center h-5">
									<input
										id={`${role.role}-${field.key}`}
										type="checkbox"
										checked={isChecked}
										onChange={(e) =>
											handlePermissionChange(field.key, e.target.checked)
										}
										disabled={
											!isEditing ||
											(isBuiltInRole && field.key === "can_manage_users")
										}
										className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded disabled:opacity-50"
									/>
								</div>
								<div className="ml-3">
									<div className="flex items-center">
										<Icon className="h-4 w-4 text-secondary-400 mr-2" />
										<label
											htmlFor={`${role.role}-${field.key}`}
											className="text-sm font-medium text-secondary-900 dark:text-white"
										>
											{field.label}
										</label>
									</div>
									<p className="text-xs text-secondary-500 mt-1">
										{field.description}
									</p>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};

// Add Role Modal Component
const AddRoleModal = ({ isOpen, onClose, onSuccess }) => {
	const roleNameInputId = useId();
	const [formData, setFormData] = useState({
		role: "",
		can_view_dashboard: true,
		can_view_hosts: true,
		can_manage_hosts: false,
		can_view_packages: true,
		can_manage_packages: false,
		can_view_users: false,
		can_manage_users: false,
		can_view_reports: true,
		can_export_data: false,
		can_manage_settings: false,
	});
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	const handleSubmit = async (e) => {
		e.preventDefault();
		setIsLoading(true);
		setError("");

		try {
			await permissionsAPI.updateRole(formData.role, formData);
			onSuccess();
		} catch (err) {
			setError(err.response?.data?.error || "Failed to create role");
		} finally {
			setIsLoading(false);
		}
	};

	const handleInputChange = (e) => {
		const { name, value, type, checked } = e.target;
		setFormData({
			...formData,
			[name]: type === "checkbox" ? checked : value,
		});
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white dark:bg-secondary-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
				<h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">
					Add New Role
				</h3>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label
							htmlFor={roleNameInputId}
							className="block text-sm font-medium text-secondary-700 dark:text-secondary-200 mb-1"
						>
							Role Name
						</label>
						<input
							id={roleNameInputId}
							type="text"
							name="role"
							required
							value={formData.role}
							onChange={handleInputChange}
							className="block w-full border-secondary-300 dark:border-secondary-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white"
							placeholder="e.g., host_manager, readonly"
						/>
						<p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
							Use lowercase with underscores (e.g., host_manager)
						</p>
					</div>

					<div className="space-y-3">
						<h4 className="text-sm font-medium text-secondary-900 dark:text-white">
							Permissions
						</h4>
						{[
							{ key: "can_view_dashboard", label: "View Dashboard" },
							{ key: "can_view_hosts", label: "View Hosts" },
							{ key: "can_manage_hosts", label: "Manage Hosts" },
							{ key: "can_view_packages", label: "View Packages" },
							{ key: "can_manage_packages", label: "Manage Packages" },
							{ key: "can_view_users", label: "View Users" },
							{ key: "can_manage_users", label: "Manage Users" },
							{ key: "can_view_reports", label: "View Reports" },
							{ key: "can_export_data", label: "Export Data" },
							{ key: "can_manage_settings", label: "Manage Settings" },
						].map((permission) => (
							<div key={permission.key} className="flex items-center">
								<input
									id={`add-role-${permission.key}`}
									type="checkbox"
									name={permission.key}
									checked={formData[permission.key]}
									onChange={handleInputChange}
									className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
								/>
								<label
									htmlFor={`add-role-${permission.key}`}
									className="ml-2 block text-sm text-secondary-700 dark:text-secondary-200"
								>
									{permission.label}
								</label>
							</div>
						))}
					</div>

					{error && (
						<div className="bg-danger-50 dark:bg-danger-900 border border-danger-200 dark:border-danger-700 rounded-md p-3">
							<p className="text-sm text-danger-700 dark:text-danger-300">
								{error}
							</p>
						</div>
					)}

					<div className="flex justify-end space-x-3">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-200 bg-white dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-md hover:bg-secondary-50 dark:hover:bg-secondary-600"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isLoading}
							className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50"
						>
							{isLoading ? "Creating..." : "Create Role"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default Permissions;
